use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppEntry {
    pub id: String,
    pub name: String,
    pub comment: Option<String>,
    pub exec: String,
    pub icon: Option<String>,
    pub categories: Vec<String>,
    pub terminal: Option<bool>,
}

pub fn scan_desktop_applications() -> Vec<AppEntry> {
    let mut apps = Vec::new();
    let dirs = [
        "/usr/share/applications",
        "/usr/local/share/applications",
        "~/.local/share/applications",
    ];

    for d in dirs {
        let path = if d.starts_with('~') {
            let home = std::env::var("HOME").unwrap_or_default();
            d.replacen('~', &home, 1)
        } else {
            d.to_string()
        };

        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.extension().map(|e| e == "desktop").unwrap_or(false) {
                    if let Ok(content) = fs::read_to_string(&p) {
                        if let Some(app) = parse_desktop_entry(&p.file_stem().unwrap().to_string_lossy(), &content) {
                            apps.push(app);
                        }
                    }
                }
            }
        }
    }

    if apps.is_empty() {
        // Builtin and fallback apps
        apps = vec![
            AppEntry {
                id: "terminal".into(),
                name: "Terminal".into(),
                comment: Some("LunaNano Terminal Shell".into()),
                exec: "terminal".into(),
                icon: Some("terminal".into()),
                categories: vec!["System".into(), "Development".into()],
                terminal: Some(false),
            },
            AppEntry {
                id: "explorer".into(),
                name: "Files".into(),
                comment: Some("File Manager".into()),
                exec: "explorer".into(),
                icon: Some("folder".into()),
                categories: vec!["System".into(), "Utilities".into()],
                terminal: Some(false),
            },
            AppEntry {
                id: "notepad".into(),
                name: "Notes".into(),
                comment: Some("Markdown Editor".into()),
                exec: "notepad".into(),
                icon: Some("edit_note".into()),
                categories: vec!["Utilities".into()],
                terminal: Some(false),
            },
            AppEntry {
                id: "calculator".into(),
                name: "Calculator".into(),
                comment: Some("Material Calculator".into()),
                exec: "calculator".into(),
                icon: Some("calculate".into()),
                categories: vec!["Utilities".into()],
                terminal: Some(false),
            },
            AppEntry {
                id: "chromium".into(),
                name: "Chromium".into(),
                comment: Some("Web Browser".into()),
                exec: "chromium --enable-features=UseOzonePlatform --ozone-platform=wayland".into(),
                icon: Some("public".into()),
                categories: vec!["Internet".into()],
                terminal: Some(false),
            },
            AppEntry {
                id: "settings".into(),
                name: "Settings".into(),
                comment: Some("LunaNano Shell Settings".into()),
                exec: "settings".into(),
                icon: Some("settings".into()),
                categories: vec!["System".into()],
                terminal: Some(false),
            },
        ];
    }

    apps
}

fn parse_desktop_entry(id: &str, content: &str) -> Option<AppEntry> {
    let mut name = None;
    let mut comment = None;
    let mut exec = None;
    let mut icon = None;
    let mut categories = Vec::new();
    let mut terminal = false;
    let mut no_display = false;

    let mut in_desktop_entry = false;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed == "[Desktop Entry]" {
            in_desktop_entry = true;
            continue;
        } else if trimmed.starts_with('[') && in_desktop_entry {
            break;
        }

        if !in_desktop_entry {
            continue;
        }

        if let Some((k, v)) = trimmed.split_once('=') {
            match k.trim() {
                "Name" if name.is_none() => name = Some(v.trim().to_string()),
                "Comment" if comment.is_none() => comment = Some(v.trim().to_string()),
                "Exec" if exec.is_none() => exec = Some(v.trim().to_string()),
                "Icon" if icon.is_none() => icon = Some(v.trim().to_string()),
                "Terminal" => terminal = v.trim().eq_ignore_ascii_case("true"),
                "NoDisplay" => no_display = v.trim().eq_ignore_ascii_case("true"),
                "Categories" => {
                    categories = v.split(';').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect();
                }
                _ => {}
            }
        }
    }

    if no_display {
        return None;
    }

    let name = name?;
    let exec = exec?;

    // Clean exec (remove %u, %F flags)
    let clean_exec = exec
        .split_whitespace()
        .filter(|arg| !arg.starts_with('%'))
        .collect::<Vec<_>>()
        .join(" ");

    Some(AppEntry {
        id: id.to_string(),
        name,
        comment,
        exec: clean_exec,
        icon,
        categories,
        terminal: Some(terminal),
    })
}
