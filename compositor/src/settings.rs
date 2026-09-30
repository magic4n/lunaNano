//! Settings storage: ~/.config/lunanano/settings.json with hot reload.

use std::path::PathBuf;
use std::sync::Arc;

use crate::CompositorState;

/// Home dir resolved via HOME, falling back to getpwuid (needed for services
/// started by systemd/greetd where HOME may be unset).
pub fn home_dir() -> String {
    if let Ok(h) = std::env::var("HOME") {
        if !h.is_empty() {
            return h;
        }
    }
    unsafe {
        let uid = libc::getuid();
        if let Some(entry) = getpwuid_cached(uid) {
            return entry;
        }
    }
    "/tmp".to_string()
}

unsafe fn getpwuid_cached(uid: u32) -> Option<String> {
    let pw = libc::getpwuid(uid as libc::uid_t);
    if pw.is_null() {
        return None;
    }
    let dir = (*pw).pw_dir as *const libc::c_char;
    if dir.is_null() {
        None
    } else {
        Some(std::ffi::CStr::from_ptr(dir).to_string_lossy().into_owned())
    }
}

pub fn config_dir() -> PathBuf {
    let base = std::env::var("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(home_dir()).join(".config"));
    base.join("lunanano")
}

pub fn data_dir() -> PathBuf {
    let base = std::env::var("XDG_DATA_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(home_dir()).join(".local").join("share"));
    base.join("lunanano")
}

pub fn settings_path() -> PathBuf {
    config_dir().join("settings.json")
}

/// Factory defaults covering every settings section from the spec.
pub fn defaults() -> serde_json::Value {
    serde_json::json!({
      "version": 1,
      "appearance": {
        "wallpaper": { "mode": "static", "path": "", "slideshowDir": "", "intervalSec": 600, "live": false },
        "palette": { "dynamic": true, "source": "wallpaper", "scheme": "tonal-spot", "fixedSourceColor": "#6750A4" },
        "theme": "auto",              // light | dark | auto
        "accentOverride": null,
        "fontUi": "Google Sans",
        "fontHeading": "Montserrat",
        "scale": 1.0,
        "cornerRadii": 24,
        "animationsEnabled": true,
        "animationSpeed": 1.0,
        "reducedMotion": false,
        "uiSounds": true
      },
      "dock": {
        "iconSize": 48,
        "autohide": false,
        "position": "bottom",         // bottom | left | right
        "magnification": 1.6,
        "separators": [],
        "pinned": ["terminal", "files", "notes", "calculator", "settings", "chromium"],
        "showIndicators": true
      },
      "workspaces": { "count": 4, "orientation": "vertical", "swipe": true },
      "apps": {
        "defaults": { "browser": "chromium", "terminal": "lunanano-terminal", "files": "lunanano-files" },
        "associations": {}
      },
      "terminal": {
        "fontFamily": "JetBrains Mono", "fontSize": 14, "theme": "m3-dark",
        "transparency": 0.95, "cursorStyle": "block", "cursorBlink": true,
        "historySize": 10000, "profiles": [{"name": "Default", "shell": ""}]
      },
      "calculator": { "mode": "simple", "history": true, "memory": true, "angleUnit": "deg" },
      "files": {
        "view": "grid", "sortBy": "name", "sortAsc": true, "showHidden": false,
        "bookmarks": ["~", "~/Documents", "~/Downloads", "~/Pictures"],
        "trashEnabled": true
      },
      "notes": {
        "folder": "~/.local/share/lunanano/notes", "theme": "auto",
        "autosaveSec": 5, "exportFormat": "md", "tags": []
      },
      "notifications": {
        "timeoutSec": 6, "dnd": false, "grouping": true,
        "position": "top-right", "historyKeep": 100
      },
      "sound": { "masterVolume": 0.6, "perApp": {}, "outputDevice": "default", "inputDevice": "default", "equalizer": [0,0,0,0,0] },
      "network": { "wifiEnabled": true, "bluetoothEnabled": false, "connectedSsid": null },
      "power": { "profile": "balanced", "lidClose": "suspend", "screenBlankMin": 10 },
      "datetime": { "format24h": true, "timezone": "auto", "ntp": true },
      "input": { "layouts": ["us"], "switchShortcut": "Super+Space", "repeatRate": 25, "repeatDelay": 500 },
      "users": { "autoLogin": false },
      "privacy": { "cameraIndicator": true, "micIndicator": true, "appPermissions": {} },
      "updates": { "autoCheck": true, "channel": "stable" },
      "hotkeys": {
        "launcher": "Super",
        "terminal": "Super+Return",
        "files": "Super+E",
        "lock": "Super+L",
        "toggleDock": "Super+D",
        "windowSwitcher": "Alt+Tab",
        "close": "Super+Q",
        "minimize": "Super+M",
        "snapLeft": "Super+Left",
        "snapRight": "Super+Right",
        "screenshot": "Print",
        "workspaceNext": "Super+Down",
        "workspacePrev": "Super+Up"
      },
      "accessibility": { "largeText": false, "highContrast": false, "onScreenKeyboard": false, "caretBlink": true }
    })
}

pub fn load(path: &PathBuf) -> serde_json::Value {
    match std::fs::read_to_string(path) {
        Ok(s) => match serde_json::from_str::<serde_json::Value>(&s) {
            Ok(v) => {
                // Merge over defaults so new keys appear after upgrades.
                let mut merged = defaults();
                deep_merge(&mut merged, v);
                merged
            }
            Err(e) => {
                tracing::warn!("settings parse error ({e}), using defaults");
                defaults()
            }
        },
        Err(_) => {
            save(path, &defaults());
            defaults()
        }
    }
}

pub fn save(path: &PathBuf, value: &serde_json::Value) {
    if let Some(dir) = path.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    let ser = serde_json::to_string_pretty(value).unwrap_or_default();
    let tmp = path.with_extension("json.tmp");
    if std::fs::write(&tmp, ser).is_ok() {
        let _ = std::fs::rename(&tmp, path);
    }
}

pub fn deep_merge(dst: &mut serde_json::Value, src: serde_json::Value) {
    match (dst, src) {
        (serde_json::Value::Object(d), serde_json::Value::Object(s)) => {
            for (k, v) in s {
                let e = d.entry(k).or_insert(serde_json::Value::Null);
                deep_merge(e, v);
            }
        }
        (dst, src) => *dst = src,
    }
}

/// Background watcher: reload + broadcast `settings_changed` on edit.
pub fn spawn_watcher(state: Arc<CompositorState>) {
    std::thread::spawn(move || {
        let path = settings_path();
        let mut last = std::fs::metadata(&path).and_then(|m| m.modified()).ok();
        loop {
            std::thread::sleep(std::time::Duration::from_millis(700));
            let now = std::fs::metadata(&path).and_then(|m| m.modified()).ok();
            if now != last && now.is_some() {
                last = now;
                let fresh = load(&path);
                {
                    let mut cur = state.settings.lock().unwrap();
                    *cur = fresh.clone();
                }
                state.broadcast(serde_json::json!({ "type": "settings_changed", "data": fresh }));
            }
        }
    });
}
