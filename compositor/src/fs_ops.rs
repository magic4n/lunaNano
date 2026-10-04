use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;
use anyhow::Result;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsItem {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: u64,
    pub modified: u64,
    pub mime_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsProgressEvent {
    pub op_id: String,
    pub operation: String,
    pub percent: u32,
    pub current_file: String,
    pub total_files: usize,
    pub completed_files: usize,
    pub status: String,
    pub error: Option<String>,
}

pub fn list_directory(dir_path: &str) -> Result<Vec<FsItem>> {
    let mut items = Vec::new();
    let entries = fs::read_dir(dir_path)?;

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let metadata = entry.metadata().ok();
        let is_directory = metadata.as_ref().map(|m| m.is_dir()).unwrap_or(false);
        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
        let modified = metadata
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        let mime_type = if is_directory {
            Some("inode/directory".into())
        } else if name.ends_with(".md") {
            Some("text/markdown".into())
        } else if name.ends_with(".json") {
            Some("application/json".into())
        } else if name.ends_with(".zip") || name.ends_with(".7z") || name.ends_with(".tar.gz") {
            Some("application/zip".into())
        } else {
            Some("application/octet-stream".into())
        };

        items.push(FsItem {
            name,
            path: path.to_string_lossy().to_string(),
            is_directory,
            size,
            modified,
            mime_type,
        });
    }

    // Sort: directories first, then alphabetically
    items.sort_by(|a, b| {
        b.is_directory.cmp(&a.is_directory).then_with(|| a.name.cmp(&b.name))
    });

    Ok(items)
}

pub fn read_file_string(file_path: &str) -> Result<String> {
    let content = fs::read_to_string(file_path)?;
    Ok(content)
}

pub fn write_file_string(file_path: &str, content: &str) -> Result<()> {
    if let Some(parent) = Path::new(file_path).parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(file_path, content)?;
    Ok(())
}

pub fn create_directory(dir_path: &str) -> Result<()> {
    fs::create_dir_all(dir_path)?;
    Ok(())
}

pub fn delete_path(path: &str) -> Result<()> {
    let p = Path::new(path);
    if p.is_dir() {
        fs::remove_dir_all(p)?;
    } else {
        fs::remove_file(p)?;
    }
    Ok(())
}

pub fn rename_path(old_path: &str, new_path: &str) -> Result<()> {
    fs::rename(old_path, new_path)?;
    Ok(())
}

pub fn copy_recursive<F>(source: &str, destination: &str, op_id: &str, mut progress: F) -> Result<()>
where
    F: FnMut(FsProgressEvent),
{
    let src = Path::new(source);
    let dst = Path::new(destination);

    if src.is_file() {
        if let Some(parent) = dst.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(src, dst)?;
        progress(FsProgressEvent {
            op_id: op_id.into(),
            operation: "copy".into(),
            percent: 100,
            current_file: source.into(),
            total_files: 1,
            completed_files: 1,
            status: "completed".into(),
            error: None,
        });
        return Ok(());
    }

    let files: Vec<_> = WalkDir::new(src).into_iter().filter_map(|e| e.ok()).collect();
    let total = files.len().max(1);

    for (idx, entry) in files.iter().enumerate() {
        let rel_path = entry.path().strip_prefix(src)?;
        let target = dst.join(rel_path);

        if entry.file_type().is_dir() {
            fs::create_dir_all(&target)?;
        } else {
            if let Some(parent) = target.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::copy(entry.path(), &target)?;
        }

        let pct = ((idx + 1) * 100 / total) as u32;
        progress(FsProgressEvent {
            op_id: op_id.into(),
            operation: "copy".into(),
            percent: pct,
            current_file: entry.path().to_string_lossy().to_string(),
            total_files: total,
            completed_files: idx + 1,
            status: if idx + 1 == total { "completed".into() } else { "running".into() },
            error: None,
        });
    }

    Ok(())
}

pub fn compress_archive<F>(
    archive_type: &str,
    sources: &[String],
    destination: &str,
    op_id: &str,
    mut progress: F,
) -> Result<()>
where
    F: FnMut(FsProgressEvent),
{
    match archive_type {
        "zip" => {
            let file = File::create(destination)?;
            let mut zip = zip::ZipWriter::new(file);
            let options = zip::write::SimpleFileOptions::default()
                .compression_method(zip::CompressionMethod::Deflated);

            let mut all_files = Vec::new();
            for src in sources {
                for entry in WalkDir::new(src).into_iter().filter_map(|e| e.ok()) {
                    all_files.push(entry.into_path());
                }
            }
            let total = all_files.len().max(1);

            for (idx, path) in all_files.iter().enumerate() {
                let name = path.file_name().unwrap_or_default().to_string_lossy();
                if path.is_file() {
                    zip.start_file(name, options)?;
                    let mut f = File::open(path)?;
                    let mut buffer = Vec::new();
                    f.read_to_end(&mut buffer)?;
                    zip.write_all(&buffer)?;
                }
                let pct = ((idx + 1) * 100 / total) as u32;
                progress(FsProgressEvent {
                    op_id: op_id.into(),
                    operation: "compress".into(),
                    percent: pct,
                    current_file: path.to_string_lossy().to_string(),
                    total_files: total,
                    completed_files: idx + 1,
                    status: if idx + 1 == total { "completed".into() } else { "running".into() },
                    error: None,
                });
            }
            zip.finish()?;
        }
        "tar.gz" => {
            let tar_gz = File::create(destination)?;
            let enc = flate2::write::GzEncoder::new(tar_gz, flate2::Compression::default());
            let mut tar = tar::Builder::new(enc);

            for src in sources {
                let p = Path::new(src);
                if p.is_dir() {
                    tar.append_dir_all(p.file_name().unwrap_or_default(), p)?;
                } else if p.is_file() {
                    let mut f = File::open(p)?;
                    tar.append_file(p.file_name().unwrap_or_default(), &mut f)?;
                }
            }
            tar.finish()?;
            progress(FsProgressEvent {
                op_id: op_id.into(),
                operation: "compress".into(),
                percent: 100,
                current_file: destination.into(),
                total_files: 1,
                completed_files: 1,
                status: "completed".into(),
                error: None,
            });
        }
        "7z" => {
            for src in sources {
                sevenz_rust::compress_to_path(src, destination)?;
            }
            progress(FsProgressEvent {
                op_id: op_id.into(),
                operation: "compress".into(),
                percent: 100,
                current_file: destination.into(),
                total_files: 1,
                completed_files: 1,
                status: "completed".into(),
                error: None,
            });
        }
        _ => anyhow::bail!("Unsupported archive type: {}", archive_type),
    }

    Ok(())
}

pub fn extract_archive<F>(
    archive_path: &str,
    destination: &str,
    op_id: &str,
    mut progress: F,
) -> Result<()>
where
    F: FnMut(FsProgressEvent),
{
    fs::create_dir_all(destination)?;

    if archive_path.ends_with(".zip") {
        let file = File::open(archive_path)?;
        let mut archive = zip::ZipArchive::new(file)?;
        let total = archive.len().max(1);

        for i in 0..archive.len() {
            let mut file = archive.by_index(i)?;
            let outpath = match file.enclosed_name() {
                Some(path) => Path::new(destination).join(path),
                None => continue,
            };

            if file.name().ends_with('/') {
                fs::create_dir_all(&outpath)?;
            } else {
                if let Some(p) = outpath.parent() {
                    if !p.exists() {
                        fs::create_dir_all(p)?;
                    }
                }
                let mut outfile = File::create(&outpath)?;
                std::io::copy(&mut file, &mut outfile)?;
            }

            let pct = ((i + 1) * 100 / total) as u32;
            progress(FsProgressEvent {
                op_id: op_id.into(),
                operation: "extract".into(),
                percent: pct,
                current_file: outpath.to_string_lossy().to_string(),
                total_files: total,
                completed_files: i + 1,
                status: if i + 1 == total { "completed".into() } else { "running".into() },
                error: None,
            });
        }
    } else if archive_path.ends_with(".tar.gz") {
        let tar_gz = File::open(archive_path)?;
        let tar = flate2::read::GzDecoder::new(tar_gz);
        let mut archive = tar::Archive::new(tar);
        archive.unpack(destination)?;
        progress(FsProgressEvent {
            op_id: op_id.into(),
            operation: "extract".into(),
            percent: 100,
            current_file: destination.into(),
            total_files: 1,
            completed_files: 1,
            status: "completed".into(),
            error: None,
        });
    } else if archive_path.ends_with(".7z") {
        sevenz_rust::decompress_file(archive_path, destination)?;
        progress(FsProgressEvent {
            op_id: op_id.into(),
            operation: "extract".into(),
            percent: 100,
            current_file: destination.into(),
            total_files: 1,
            completed_files: 1,
            status: "completed".into(),
            error: None,
        });
    }

    Ok(())
}
