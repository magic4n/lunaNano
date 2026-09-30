//! freedesktop .desktop application database.
//!
//! Scans XDG data dirs for desktop entries, parses them and exposes launch
//! info (Exec with %U expansion, icon, name) to the shell for the launcher,
//! dock and file associations.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppEntry {
    pub id: String, // e.g. "chromium.desktop" without .desktop in `name` field below
    pub name: String,
    pub generic_name: Option<String>,
    pub comment: Option<String>,
    pub exec: String,
    pub icon: Option<String>,
    pub categories: Vec<String>,
    pub terminal: bool,
    pub mime_types: Vec<String>,
    pub path: PathBuf,
}

fn parse_desktop(content: &str) -> Option<HashMap<String, String>> {
    let mut map = HashMap::new();
    let mut in_entry = false;
    for line in content.lines() {
        let line = line.trim();
        if line == "[Desktop Entry]" {
            in_entry = true;
            continue;
        }
        if line.starts_with('[') {
            in_entry = false;
            continue;
        }
        if !in_entry || line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some((k, v)) = line.split_once('=') {
            map.insert(k.trim().to_string(), v.trim().to_string());
        }
    }
    if map.is_empty() {
        None
    } else {
        Some(map)
    }
}

fn localized<'a>(m: &'a HashMap<String, String>, key: &str) -> Option<&'a str> {
    // Prefer unlocalized, then any [xx_YY] variant.
    if let Some(v) = m.get(key) {
        return Some(v.as_str());
    }
    m.iter()
        .find(|(k, _)| k.starts_with(&format!("{key}[")))
        .map(|(_, v)| v.as_str())
}

pub fn scan() -> Vec<AppEntry> {
    let mut dirs: Vec<PathBuf> = Vec::new();
    if let Ok(x) = std::env::var("XDG_DATA_DIRS") {
        dirs.extend(x.split(':').map(PathBuf::from));
    }
    dirs.push(PathBuf::from("/usr/local/share"));
    dirs.push(PathBuf::from("/usr/share"));
    dirs.push(PathBuf::from(crate::settings::home_dir()).join(".local").join("share"));

    let mut out: Vec<AppEntry> = Vec::new();
    let mut seen: HashMap<String, usize> = HashMap::new();
    for dir in dirs {
        let apps = dir.join("applications");
        if !apps.is_dir() {
            continue;
        }
        collect(&apps, &mut out);
    }
    // De-duplicate by id, first (highest priority dir) wins.
    let mut dedup: Vec<AppEntry> = Vec::new();
    for e in out {
        if seen.contains_key(&format!("{}{}", e.name, e.id)) {
            continue;
        }
        seen.insert(format!("{}{}", e.name, e.id), 0);
        dedup.push(e);
    }
    dedup.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    dedup
}

fn collect(dir: &Path, out: &mut Vec<AppEntry>) {
    let rd = match std::fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return,
    };
    for entry in rd.flatten() {
        let p = entry.path();
        if p.is_dir() {
            if p.file_name().map(|n| n == "mime").unwrap_or(false) {
                continue;
            }
            collect(&p, out);
            continue;
        }
        if p.extension().map(|e| e != "desktop").unwrap_or(true) {
            continue;
        }
        let Ok(content) = std::fs::read_to_string(&p) else {
            continue;
        };
        let Some(m) = parse_desktop(&content) else {
            continue;
        };
        if m.get("NoDisplay").map(|v| v == "true").unwrap_or(false) {
            continue;
        }
        if m.get("Hidden").map(|v| v == "true").unwrap_or(false) {
            continue;
        }
        let Some(exec) = localized(&m, "Exec").map(|s| s.to_string()) else {
            continue;
        };
        let name = localized(&m, "Name").unwrap_or("Unknown").to_string();
        let id = p
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("app.desktop")
            .to_string();
        out.push(AppEntry {
            id,
            name,
            generic_name: localized(&m, "GenericName").map(|s| s.to_string()),
            comment: localized(&m, "Comment").map(|s| s.to_string()),
            exec: exec
                .split(" -- ")
                .next()
                .unwrap_or("")
                .replace("%F", "")
                .replace("%f", "")
                .replace("%U", "")
                .replace("%u", "")
                .replace("%U", "")
                .trim()
                .to_string(),
            icon: localized(&m, "Icon").map(|s| s.to_string()),
            categories: localized(&m, "Categories")
                .unwrap_or("")
                .split(';')
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string())
                .collect(),
            terminal: m.get("Terminal").map(|v| v == "true").unwrap_or(false),
            mime_types: localized(&m, "MimeType")
                .unwrap_or("")
                .split(';')
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string())
                .collect(),
            path: p,
        });
    }
}

/// Expand an Exec line with URL arguments (%U).
pub fn expand_exec(exec: &str, urls: &[String]) -> Vec<String> {
    let joined = urls.join(" ");
    if exec.contains("%U") {
        vec![exec.replace("%U", &joined)]
    } else if exec.contains("%u") {
        vec![exec.replace("%u", &joined)]
    } else if exec.contains("%F") || exec.contains("%f") {
        urls.iter()
            .map(|u| exec.replace("%F", u).replace("%f", u))
            .collect()
    } else if urls.is_empty() {
        vec![exec.to_string()]
    } else {
        vec![format!("{exec} {joined}")]
    }
}
