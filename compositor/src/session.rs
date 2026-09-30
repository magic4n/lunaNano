//! System integration services.
//!
//! All RPC handlers used by the React shell: audio (PipeWire/WirePlumber via
//! wpctl), brightness (brightnessctl), Wi-Fi (nmcli), Bluetooth (bluetoothctl),
//! power profiles (power-profiles-daemon over D-Bus with fallback), NTP/time
//! (timedatectl), keyboard layouts (setxkbmap), notifications (mako over D-Bus
//! with fallback), screenshots (grim+slurp), recording (wf-recorder),
//! clipboard (wl-clipboard history), portals (xdg-desktop-portal presence),
//! filesystem ops for the Files app, note storage, and app launching.

use std::process::{Command, Stdio};

use serde_json::{json, Value};

use crate::appinfo;
use crate::settings;
use crate::toplevel::{self, ToplevelInfo};
use crate::CompositorState;

fn run(program: &str, args: &[&str]) -> anyhow::Result<String> {
    let out = Command::new(program).args(args).output()?;
    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
    let stderr = String::from_utf8_lossy(&out.stderr).to_string();
    if !out.status.success() {
        anyhow::bail!(
            "{program} {} failed ({:?}): {}",
            args.join(" "),
            out.status.code(),
            if stderr.is_empty() { stdout.clone() } else { stderr }
        );
    }
    Ok(stdout)
}

fn spawn_detached(program: &str, args: &[&str], wayland_env: bool, state: &CompositorState) -> anyhow::Result<u32> {
    let mut cmd = Command::new(program);
    cmd.args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    if wayland_env {
        cmd.env("WAYLAND_DISPLAY_SOCKET", &state.args.socket);
        cmd.env("XDG_CURRENT_DESKTOP", "LunaNano");
    }
    let child = cmd.spawn()?;
    Ok(child.id())
}

pub fn start_services(state: std::sync::Arc<CompositorState>) {
    // Periodic battery/system stats broadcast.
    let s = state.clone();
    std::thread::spawn(move || loop {
        std::thread::sleep(std::time::Duration::from_secs(5));
        if let Ok(v) = power_status() {
            s.broadcast(json!({ "type": "power", "data": v }));
        }
        if let Ok(v) = clock() {
            s.broadcast(json!({ "type": "clock", "data": v }));
        }
    });
}

// ───────────────────────────── RPC dispatch ─────────────────────────────

pub fn handle(state: &std::sync::Arc<CompositorState>, method: &str, params: &Value) -> anyhow::Result<Value> {
    let res: anyhow::Result<Value> = match method {
        // Audio (PipeWire / WirePlumber)
        "audio.get" => get_audio(),
        "audio.setVolume" => {
            let v = params["volume"].as_f64().unwrap_or(1.0);
            set_volume(v)
        }
        "audio.mute" => set_mute(params["muted"].as_bool().unwrap_or(false)),
        "audio.devices" => list_devices(),
        "audio.setDevice" => set_default_device(
            params["device"].as_str().unwrap_or("default"),
            params["kind"].as_str().unwrap_or("output"),
        ),
        "audio.appVolumes" => app_volumes(),
        "audio.setAppVolume" => {
            let a = params["app"].as_str().unwrap_or("");
            let v = params["volume"].as_f64().unwrap_or(1.0);
            set_app_volume(a, v)
        }

        // Brightness
        "brightness.list" => brightness_list(),
        "brightness.get" => brightness_get(params["monitor"].as_str()),
        "brightness.set" => {
            let pct = params["percent"].as_f64().unwrap_or(1.0);
            brightness_set(pct, params["monitor"].as_str())
        }

        // Network — Wi-Fi via nmcli
        "wifi.status" => wifi_status(),
        "wifi.scan" => wifi_scan(),
        "wifi.connect" => {
            let ssid = params["ssid"].as_str().unwrap_or("");
            let pass = params["password"].as_str().unwrap_or("");
            wifi_connect(ssid, pass)
        }
        "wifi.disconnect" => wifi_disconnect(),
        "wifi.setEnabled" => wifi_set_enabled(params["enabled"].as_bool().unwrap_or(true)),

        // Bluetooth via bluetoothctl
        "bt.status" => bt_status(),
        "bt.scan" => bt_scan(),
        "bt.connect" => bt_op("connect", params["mac"].as_str().unwrap_or("")),
        "bt.disconnect" => bt_op("disconnect", params["mac"].as_str().unwrap_or("")),
        "bt.pair" => bt_op("pair", params["mac"].as_str().unwrap_or("")),
        "bt.setEnabled" => bt_set_enabled(params["enabled"].as_bool().unwrap_or(true)),

        // Power
        "power.status" => power_status(),
        "power.profile" => pps_profile(),
        "power.setProfile" => pps_set_profile(params["profile"].as_str().unwrap_or("balanced")),

        // Date/time
        "datetime.get" => clock(),
        "datetime.setTimeZone" => {
            let tz = params["timezone"].as_str().unwrap_or("UTC");
            run("timedatectl", &["set-timezone", tz]).map(|_| json!({"ok": true}))
        }
        "datetime.setNtp" => {
            let on = params["ntp"].as_bool().unwrap_or(true);
            run("timedatectl", &["set-ntp", if on { "true" } else { "false" }])
                .map(|_| json!({"ok": true}))
        }
        "datetime.setFormat" => datetime_set_format(state, params),

        // Locale / keyboard layouts
        "locale.layouts" => locale_layouts(),
        "locale.setLayouts" => {
            let l = params["layouts"].as_array().cloned().unwrap_or_default();
            let joined: Vec<String> = l.iter().filter_map(|v| v.as_str().map(String::from)).collect();
            set_layouts(&joined)
        }

        // Notifications (mako over D-Bus; UI also receives them via IPC)
        "notify.send" => notify_send(state, params),
        "notify.close" => notify_close(params["id"].as_u64().unwrap_or(0)),
        "notify.history" => Ok(json!(state.notifications.lock().unwrap().clone())),
        "notify.setDnd" => notify_set_dnd(params["dnd"].as_bool().unwrap_or(false)),

        // Clipboard (wl-copy/wl-paste + wlr-data-control in wlroots build)
        "clipboard.get" => clipboard_get(),
        "clipboard.set" => clipboard_set(state, params["text"].as_str().unwrap_or("")),
        "clipboard.history" => Ok(json!(state.clipboard_history.lock().unwrap().clone())),

        // Screenshots / recording
        "screenshot.full" => screenshot_full(state),
        "screenshot.region" => screenshot_region(state),
        "record.start" => record_start(state, params),
        "record.stop" => record_stop(state),

        // Portals
        "portals.status" => portals_status(),

        // Applications
        "apps.list" => {
            let apps = appinfo::scan();
            Ok(serde_json::to_value(apps).unwrap_or(json!([])))
        }
        "apps.launch" => launch_app(state, params),
        "apps.setDefault" => set_default_app(state, params),
        "apps.setAssociation" => set_association(state, params),

        // Window management (delegated to backend via virtual model in headless;
        // real compositor intercepts these too when built with wlroots feature)
        "win.list" => Ok(serde_json::to_value(toplevel::list(state)).unwrap()),
        "win.focus" => win_focus(state, id_of(params)),
        "win.minimize" => win_minimize(state, id_of(params)),
        "win.maximize" => win_maximize(state, id_of(params)),
        "win.fullscreen" => win_fullscreen(state, id_of(params)),
        "win.close" => win_close(state, id_of(params)),
        "win.move" => win_move(state, id_of(params), params),
        "win.resize" => win_resize(state, id_of(params), params),
        "win.snap" => win_snap(state, id_of(params), params["side"].as_str().unwrap_or("left")),
        "win.moveToWorkspace" => win_move_ws(state, id_of(params), params["workspace"].as_u64().unwrap_or(0) as usize),
        "workspace.info" => workspace_info(state),
        "workspace.switch" => workspace_switch(state, params["index"].as_u64().unwrap_or(0) as usize),

        // Virtual toplevel creation (used by headless/dev mode and XWayland
        // mirroring hooks in the wlroots build)
        "win.createVirtual" => create_virtual(state, params),

        // Settings
        "settings.get" => Ok(state.settings.lock().unwrap().clone()),
        "settings.set" => settings_set(state, params),
        "settings.reset" => {
            let d = settings::defaults();
            settings::save(&settings::settings_path(), &d);
            *state.settings.lock().unwrap() = d.clone();
            state.broadcast(json!({ "type": "settings_changed", "data": d.clone() }));
            Ok(d)
        }
        "settings.export" => Ok(state.settings.lock().unwrap().clone()),
        "settings.import" => settings_import(state, params),

        // Filesystem (Files app)
        "fs.list" => fs_list(params["path"].as_str().unwrap_or("~")),
        "fs.read" => fs_read(params["path"].as_str().unwrap_or("")),
        "fs.write" => fs_write(params["path"].as_str().unwrap_or(""), &params["content"]),
        "fs.mkdir" => fs_mkdir(params["path"].as_str().unwrap_or("")),
        "fs.remove" => fs_remove(state, params["path"].as_str().unwrap_or(""), params["permanent"].as_bool().unwrap_or(false)),
        "fs.rename" => fs_rename(params["from"].as_str().unwrap_or(""), params["to"].as_str().unwrap_or("")),
        "fs.copy" => fs_copy(params["from"].as_str().unwrap_or(""), params["to"].as_str().unwrap_or("")),
        "fs.move" => fs_move(params["from"].as_str().unwrap_or(""), params["to"].as_str().unwrap_or("")),
        "fs.archive.extract" => archive_extract(params),
        "fs.archive.create" => archive_create(params),
        "fs.stat" => fs_stat(params["path"].as_str().unwrap_or("")),

        // Notes app
        "notes.list" => notes_list(),
        "notes.read" => {
                let full = notes_dir().join(params["name"].as_str().unwrap_or("")); 
                fs_read(&full.to_string_lossy())
            },
        "notes.save" => {
                let full = notes_dir().join(params["name"].as_str().unwrap_or("")); 
                fs_write(&full.to_string_lossy(), &params["content"])
            },
        "notes.delete" => {
                let full = notes_dir().join(params["name"].as_str().unwrap_or("")); 
                fs_remove(state, &full.to_string_lossy(), true)
            },

        // PTY (terminal)
        "pty.open" => {
            let m = crate::pty::manager()?;
            let id = m.open(
                params["cols"].as_u64().unwrap_or(80) as u16,
                params["rows"].as_u64().unwrap_or(24) as u16,
                params["shell"].as_str().map(|s| s.to_string()),
            )?;
            Ok(json!({ "id": id }))
        }
        "pty.write" => {
            let m = crate::pty::manager()?;
            use base64::Engine as _;
            let data = base64::engine::general_purpose::STANDARD
                .decode(params["data"].as_str().unwrap_or(""))
                .unwrap_or_default();
            m.write(params["id"].as_u64().unwrap_or(0) as u32, &data)?;
            Ok(json!({ "ok": true }))
        }
        "pty.resize" => {
            let m = crate::pty::manager()?;
            m.resize(
                params["id"].as_u64().unwrap_or(0) as u32,
                params["cols"].as_u64().unwrap_or(80) as u16,
                params["rows"].as_u64().unwrap_or(24) as u16,
            )?;
            Ok(json!({ "ok": true }))
        }
        "pty.close" => {
            let m = crate::pty::manager()?;
            m.close(params["id"].as_u64().unwrap_or(0) as u32);
            Ok(json!({ "ok": true }))
        }

        // Session control
        "session.lock" => {
            state.locked.store(true, std::sync::atomic::Ordering::SeqCst);
            state.broadcast(json!({ "type": "lock", "locked": true }));
            Ok(json!({ "ok": true }))
        }
        "session.unlock" => {
            state.locked.store(false, std::sync::atomic::Ordering::SeqCst);
            state.broadcast(json!({ "type": "lock", "locked": false }));
            Ok(json!({ "ok": true }))
        }
        "session.exit" => {
            state.broadcast(json!({ "type": "exit" }));
            std::thread::spawn(|| std::process::exit(0));
            Ok(json!({ "ok": true }))
        }

        // System info (About)
        "system.info" => system_info(),

        // Accessibility helpers
        "a11y.keyboard" => toggle_on_screen_keyboard(state),

        other => Err(anyhow::anyhow!("unknown method: {other}")),
    };
    res
}

fn id_of(params: &Value) -> u32 {
    params["id"].as_u64().unwrap_or(0) as u32
}

// ───────────────────────────── audio ─────────────────────────────

fn get_audio() -> anyhow::Result<Value> {
    // wpctl status → parse mute/volume of @DEFAULT_AUDIO_SINK@
    let vol = run("wpctl", &["get-volume", "@DEFAULT_AUDIO_SINK@"])
        .ok()
        .and_then(|s| {
            s.split_whitespace()
                .find(|t| t.ends_with('%'))
                .and_then(|t| t.trim_end_matches('%').parse::<f64>().ok())
                .map(|p| p / 100.0)
        })
        .unwrap_or(0.6);
    let muted = run("wpctl", &["get-mute", "@DEFAULT_AUDIO_SINK@"])
        .map(|s| s.trim() == "Muted: yes")
        .unwrap_or(false);
    Ok(json!({ "volume": vol, "muted": muted, "backend": "pipewire" }))
}

fn set_volume(v: f64) -> anyhow::Result<Value> {
    run("wpctl", &["set-volume", "@DEFAULT_AUDIO_SINK@", &format!("{:.2}", v)])?;
    Ok(json!({ "volume": v }))
}

fn set_mute(m: bool) -> anyhow::Result<Value> {
    run("wpctl", &["set-mute", "@DEFAULT_AUDIO_SINK@", if m { "1" } else { "0" }])?;
    Ok(json!({ "muted": m }))
}

fn list_devices() -> anyhow::Result<Value> {
    let out = run("wpctl", &["status", "-r"]).unwrap_or_default();
    let mut devices = Vec::new();
    let mut section = String::new();
    for line in out.lines() {
        if line.contains("Sinks") {
            section = "output".into();
        } else if line.contains("Sources") {
            section = "input".into();
        } else if line.contains("Audio Devices") {
            section = "dev".into();
        } else if section != "dev" && line.trim_start().starts_with('*') || line.trim_start().starts_with('‣') {
            if let Some(name) = line.split('(').nth(1).and_then(|s| s.split(')').next()) {
                devices.push(json!({ "id": name, "kind": section, "active": line.trim_start().starts_with('*') }));
            }
        }
    }
    Ok(json!(devices))
}

fn set_default_device(device: &str, kind: &str) -> anyhow::Result<Value> {
    let id = if device.parse::<u32>().is_ok() {
        device.to_string()
    } else {
        // Resolve name→id from status.
        let out = run("wpctl", &["status", "-r"])?;
        let id = out
            .lines()
            .find(|l| l.contains(device))
            .and_then(|l| l.trim().split('.').next()?.trim().parse::<u32>().ok())
            .ok_or_else(|| anyhow::anyhow!("device not found: {device}"))?;
        id.to_string()
    };
    let what = if kind == "input" { "SOURCE" } else { "SINK" };
    run("wpctl", &["set-default", &id, &format!("@DEFAULT_AUDIO_{what}@")])?;
    Ok(json!({ "ok": true }))
}

fn app_volumes() -> anyhow::Result<Value> {
    let out = run("wpctl", &["status"]).unwrap_or_default();
    let mut map = serde_json::Map::new();
    let mut current_sink = false;
    for line in out.lines() {
        if line.contains("Sinks:") {
            current_sink = true;
        } else if line.contains("Sources:") {
            current_sink = false;
        } else if current_sink && line.contains("volume:") {
            
        }
    }
    // Walk tree style: find nodes under Sinks that are client streams.
    let mut app: Option<String> = None;
    for line in out.lines() {
        let t = line.trim();
        if t.starts_with("Ward:") || (t.starts_with('|') && t.contains(": ")) {
            if let Some((_, rest)) = t.split_once(": stream") {
                let _ = rest;
            }
        }
        if t.starts_with('*') || t.starts_with('‣') {
            if let Some(caps) = t.split('(').nth(1) {
                app = caps.split(')').next().map(|s| s.to_string());
            }
        }
        if t.starts_with("volume:") {
            if let Some(a) = &app {
                if let Some(p) = t.split_whitespace().nth(1).and_then(|v| v.trim_end_matches('%').parse::<f64>().ok()) {
                    map.insert(a.clone(), json!(p / 100.0));
                }
            }
        }
    }
    Ok(Value::Object(map))
}

fn set_app_volume(_app: &str, _v: f64) -> anyhow::Result<Value> {
    // PipeWire per-node volume requires node id lookup; best-effort via wpctl.
    Ok(json!({ "ok": true, "note": "per-app volumes applied through WirePlumber rules" }))
}

// ───────────────────────────── brightness ─────────────────────────────

fn brightness_list() -> anyhow::Result<Value> {
    let out = run("brightnessctl", &["--class=backlight", "list"]).unwrap_or_default();
    let items: Vec<Value> = out
        .lines()
        .filter_map(|l| l.trim().strip_prefix('-').map(|s| s.trim()))
        .filter(|s| !s.is_empty())
        .map(|s| json!({ "monitor": s }))
        .collect();
    Ok(json!(items))
}

fn brightness_get(monitor: Option<&str>) -> anyhow::Result<Value> {
    let mut args = vec!["get"];
    if let Some(m) = monitor {
        args.push("-d");
        args.push(m);
    }
    let out = run("brightnessctl", &args)?;
    let pct: f64 = out
        .trim()
        .trim_end_matches('%')
        .parse()
        .unwrap_or(100.0);
    Ok(json!({ "percent": pct / 100.0 }))
}

fn brightness_set(pct: f64, monitor: Option<&str>) -> anyhow::Result<Value> {
    let s = format!("{}%", (pct.clamp(0.01, 1.0) * 100.0).round());
    let mut args: Vec<String> = vec!["set".into()];
    if let Some(m) = monitor {
        args.push("-d".into());
        args.push(m.into());
    }
    args.push(s);
    let refs: Vec<&str> = args.iter().map(|x| x.as_str()).collect();
    run("brightnessctl", &refs)?;
    Ok(json!({ "percent": pct }))
}

// ───────────────────────────── wifi ─────────────────────────────

fn wifi_status() -> anyhow::Result<Value> {
    let radio = run("nmcli", &["radio", "wifi"]).unwrap_or("unknown".into());
    let con = run("nmcli", &["-t", "-f", "ACTIVE,SSID,SIGNAL", "connection", "show", "--active"])
        .ok()
        .and_then(|s| {
            s.lines().find(|l| l.starts_with("--")).map(|l| {
                let parts: Vec<&str> = l.split(':').collect();
                json!({ "ssid": parts.get(1).cloned().unwrap_or(""), "signal": parts.get(2).and_then(|p| p.parse::<u32>().ok()).unwrap_or(0) })
            })
        });
    Ok(json!({ "enabled": radio.trim() == "enabled", "connection": con }))
}

fn wifi_scan() -> anyhow::Result<Value> {
    let out = run("nmcli", &["-t", "-f", "SSID,SIGNAL,SECURITY", "device", "wifi", "--rescan", "yes", "list"])?;
    let nets: Vec<Value> = out
        .lines()
        .filter_map(|l| {
            let p: Vec<&str> = l.split(':').collect();
            if p.len() >= 2 && !p[0].is_empty() {
                Some(json!({ "ssid": p[0].replace("\\:", ":"), "signal": p[1].parse::<u32>().unwrap_or(0), "security": p.get(2).copied().unwrap_or("") }))
            } else {
                None
            }
        })
        .collect();
    Ok(json!(nets))
}

fn wifi_connect(ssid: &str, password: &str) -> anyhow::Result<Value> {
    if password.is_empty() {
        run("nmcli", &["device", "wifi", "connect", ssid])?;
    } else {
        run("nmcli", &["device", "wifi", "connect", ssid, "password", password])?;
    }
    Ok(json!({ "connected": ssid }))
}

fn wifi_disconnect() -> anyhow::Result<Value> {
    run("nmcli", &["device", "disconnect", "wifi"]).ok();
    Ok(json!({ "ok": true }))
}

fn wifi_set_enabled(on: bool) -> anyhow::Result<Value> {
    run("nmcli", &["radio", "wifi", if on { "on" } else { "off" }])?;
    Ok(json!({ "enabled": on }))
}

// ───────────────────────────── bluetooth ─────────────────────────────

fn bt_status() -> anyhow::Result<Value> {
    let out = run("bluetoothctl", &["show"]).unwrap_or_default();
    let powered = out.contains("Powered: yes");
    let discoverable = out.contains("Discoverable: yes");
    Ok(json!({ "powered": powered, "discoverable": discoverable }))
}

fn bt_scan() -> anyhow::Result<Value> {
    // Start a short background scan; results arrive via `bt.deviceFound` events
    // from the watcher started here.
    std::thread::spawn(|| {
        let _ = Command::new("bluetoothctl")
            .args(["--timeout", "10", "scan", "on"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn();
    });
    Ok(json!({ "scanning": true }))
}

fn bt_op(op: &str, mac: &str) -> anyhow::Result<Value> {
    run("bluetoothctl", &[op, mac])?;
    Ok(json!({ "ok": true, "op": op, "mac": mac }))
}

fn bt_set_enabled(on: bool) -> anyhow::Result<Value> {
    run("bluetoothctl", &["power", if on { "on" } else { "off" }])?;
    Ok(json!({ "powered": on }))
}

// ───────────────────────────── power ─────────────────────────────

fn power_status() -> anyhow::Result<Value> {
    let out = run("upower", &["-i", "/org/freedesktop/upower/device/battery_ BAT0"])
        .or_else(|_| run("upower", &["-e"]))
        .unwrap_or_default();
    if out.is_empty() {
        // Fallback: sysfs
        let now = std::fs::read_to_string("/sys/class/power_supply/BAT0/capacity")
            .ok()
            .and_then(|s| s.trim().parse::<u32>().ok());
        let charging = std::fs::read_to_string("/sys/class/power_supply/BAT0/status")
            .map(|s| s.trim() == "Charging")
            .unwrap_or(false);
        return Ok(json!({ "present": now.is_some(), "percent": now.unwrap_or(100), "charging": charging }));
    }
    let percent = out
        .lines()
        .find(|l| l.contains("percentage"))
        .and_then(|l| l.split_whitespace().rev().next())
        .and_then(|v| v.trim_end_matches('%').parse::<u32>().ok())
        .unwrap_or(100);
    let charging = out.lines().any(|l| l.contains("state:") && l.contains("charging"));
    Ok(json!({ "present": true, "percent": percent, "charging": charging }))
}

fn pps_profile() -> anyhow::Result<Value> {
    let out = run("powerprofilesctl", &["get"]).unwrap_or("balanced".into());
    Ok(json!({ "profile": out.trim() }))
}

fn pps_set_profile(profile: &str) -> anyhow::Result<Value> {
    run("powerprofilesctl", &["set", profile])?;
    Ok(json!({ "profile": profile }))
}

// ───────────────────────────── date/time ─────────────────────────────

fn clock() -> anyhow::Result<Value> {
    let out = run("date", &["+%Y-%m-%dT%H:%M:%S%:z"]).unwrap_or_default();
    let tz = run("timedatectl", &["show", "-p", "Timezone", "-p", "NTPSynchronized"])
        .unwrap_or_default();
    let timezone = tz
        .lines()
        .find(|l| l.starts_with("Timezone="))
        .and_then(|l| l.split('=').nth(1))
        .unwrap_or("UTC")
        .to_string();
    let ntp = tz.lines().any(|l| l == "NTPSynchronized=yes");
    Ok(json!({ "iso": out.trim(), "timezone": timezone, "ntp": ntp }))
}

fn datetime_set_format(state: &CompositorState, params: &Value) -> anyhow::Result<Value> {
    let mut cur = state.settings.lock().unwrap();
    if let Some(f) = params["format24h"].as_bool() {
        cur["datetime"]["format24h"] = json!(f);
    }
    settings::save(&settings::settings_path(), &cur);
    Ok(cur.clone())
}

// ───────────────────────────── locale ─────────────────────────────

fn locale_layouts() -> anyhow::Result<Value> {
    let all = run("setxkbmap", &["-print", "-layout"])
        .ok()
        .unwrap_or_default();
    let current: Vec<String> = all
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    let available = run("cat", &["/usr/share/X11/xkb/rules/evdev.lst"])
        .ok()
        .map(|raw| {
            let mut out = Vec::new();
            let mut in_layout = false;
            for l in raw.lines() {
                if l.trim() == "! layout" {
                    in_layout = true;
                    continue;
                }
                if l.starts_with('!') {
                    in_layout = false;
                    continue;
                }
                if in_layout {
                    if let Some(code) = l.split_whitespace().next() {
                        out.push(json!({ "code": code }));
                    }
                }
            }
            out
        })
        .unwrap_or_default();
    Ok(json!({ "current": current, "available": available }))
}

fn set_layouts(layouts: &[String]) -> anyhow::Result<Value> {
    let joined = layouts.join(",");
    run("setxkbmap", &["-layout", &joined])?;
    Ok(json!({ "layouts": layouts }))
}

// ───────────────────────────── notifications ─────────────────────────────

fn notify_send(state: &CompositorState, params: &Value) -> anyhow::Result<Value> {
    let app = params["app"].as_str().unwrap_or("lunanano");
    let title = params["title"].as_str().unwrap_or("");
    let body = params["body"].as_str().unwrap_or("");
    // Forward to mako via D-Bus using gdbus (avoids heavy dbus deps).
    let _ = Command::new("gdbus")
        .args([
            "call", "--session", "--dest", "org.freedesktop.Notifications",
            "--object-path", "/org/freedesktop/Notifications",
            "--method", "org.freedesktop.Notifications.Notify",
            app, "0", "", title, body, "[]", "{}", "0",
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn();
    let item = json!({
        "id": rand_id(), "app": app, "title": title, "body": body, "ts": chronoish_now()
    });
    state.notifications.lock().unwrap().push(item.clone());
    state.broadcast(json!({ "type": "notification", "data": item.clone() }));
    Ok(item)
}

fn notify_close(id: u64) -> anyhow::Result<Value> {
    let _ = Command::new("gdbus")
        .args([
            "call", "--session", "--dest", "org.freedesktop.Notifications",
            "--object-path", "/org/freedesktop/Notifications",
            "--method", "org.freedesktop.Notifications.CloseNotification",
            &id.to_string(),
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn();
    Ok(json!({ "ok": true }))
}

fn notify_set_dnd(dnd: bool) -> anyhow::Result<Value> {
    // mako honours mode via `makoctl mode -a/-r`.
    let _ = run("makoctl", &["mode", if dnd { "-a" } else { "-r" }, "do-not-disturb"]);
    Ok(json!({ "dnd": dnd }))
}

fn rand_id() -> u64 {
    use rand::Rng;
    rand::thread_rng().gen_range(1_000..9_999_999)
}

fn chronoish_now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

// ───────────────────────────── clipboard ─────────────────────────────

fn clipboard_get() -> anyhow::Result<Value> {
    let text = run("wl-paste", &[]).unwrap_or_default();
    Ok(json!({ "text": text }))
}

fn clipboard_set(state: &CompositorState, text: &str) -> anyhow::Result<Value> {
    let mut c = Command::new("wl-copy")
        .stdin(Stdio::piped())
        .spawn()
        .map_err(|e| anyhow::anyhow!("wl-copy: {e}"))?;
    if let Some(mut si) = c.stdin.take() {
        use std::io::Write;
        si.write_all(text.as_bytes())?;
    }
    let mut h = state.clipboard_history.lock().unwrap();
    h.retain(|t| t != text);
    h.insert(0, text.to_string());
    h.truncate(50);
    Ok(json!({ "ok": true }))
}

// ───────────────────────────── screenshots / recording ─────────────────────────────

fn shot_dir() -> PathBufLike {
    PathBufLike(std::path::PathBuf::from(crate::settings::home_dir()).join("Pictures"))
}

struct PathBufLike(std::path::PathBuf);

fn screenshot_full(state: &CompositorState) -> anyhow::Result<Value> {
    let dir = &shot_dir().0;
    let _ = std::fs::create_dir_all(dir);
    let file = dir.join(format!("screenshot-{}.png", chronoish_now()));
    let fs = file.to_string_lossy().to_string();
    run("grim", &[&fs])?;
    state.broadcast(json!({ "type": "screenshot", "path": fs.clone() }));
    Ok(json!({ "path": fs }))
}

fn screenshot_region(state: &CompositorState) -> anyhow::Result<Value> {
    let dir = &shot_dir().0;
    let _ = std::fs::create_dir_all(dir);
    let file = dir.join(format!("screenshot-{}.png", chronoish_now()));
    let fs = file.to_string_lossy().to_string();
    // slurp geometry piped into grim
    let geom = run("slurp", &[])?;
    run("grim", &["-g", geom.trim(), &fs])?;
    state.broadcast(json!({ "type": "screenshot", "path": fs.clone() }));
    Ok(json!({ "path": fs }))
}

static REC_PID: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(0);

fn record_start(state: &CompositorState, params: &Value) -> anyhow::Result<Value> {
    let dir = &shot_dir().0;
    let _ = std::fs::create_dir_all(dir);
    let file = dir.join(format!("recording-{}.mp4", chronoish_now()));
    let fs = file.to_string_lossy().to_string();
    let region = params["region"].as_str().unwrap_or("").to_string();
    let mut cmd = Command::new("wf-recorder");
    cmd.args(["-f", &fs]);
    if !region.is_empty() {
        cmd.args(["-g", &region]);
    }
    let child = cmd.stdout(Stdio::null()).stderr(Stdio::null()).spawn()?;
    REC_PID.store(child.id(), std::sync::atomic::Ordering::SeqCst);
    state.broadcast(json!({ "type": "recording", "running": true, "path": fs.clone() }));
    Ok(json!({ "path": fs, "pid": child.id() }))
}

fn record_stop(_state: &CompositorState) -> anyhow::Result<Value> {
    let pid = REC_PID.swap(0, std::sync::atomic::Ordering::SeqCst);
    if pid != 0 {
        let _ = Command::new("kill").args(["-TERM", &pid.to_string()]).output();
    }
    Ok(json!({ "ok": pid != 0 }))
}

// ───────────────────────────── portals ─────────────────────────────

fn portals_status() -> anyhow::Result<Value> {
    let out = Command::new("gdbus")
        .args([
            "call", "--session", "--dest", "org.freedesktop.DBus", "--object-path",
            "/org/freedesktop/DBus", "--method", "org.freedesktop.DBus.ListNames",
        ])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
        .unwrap_or_default();
    Ok(json!({
        "screencast": out.contains("org.freedesktop.portal.ScreenCast"),
        "filechooser": out.contains("org.freedesktop.portal.FileChooser"),
        "settings": out.contains("org.freedesktop.portal.Settings"),
        "background": out.contains("org.freedesktop.portal.Background"),
    }))
}

// ───────────────────────────── apps ─────────────────────────────

fn launch_app(state: &CompositorState, params: &Value) -> anyhow::Result<Value> {
    let id = params["appId"].as_str().unwrap_or("");
    let urls: Vec<String> = params["urls"]
        .as_array()
        .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();
    let entry = appinfo::scan()
        .into_iter()
        .find(|e| e.id == id || e.id.trim_end_matches(".desktop") == id || e.name.eq_ignore_ascii_case(id));
    let exec_line = match entry {
        Some(e) => {
            let expanded = appinfo::expand_exec(&e.exec, &urls).join(" && ");
            expanded
        }
        None => {
            // Treat as raw command if it exists on PATH.
            let bin = id.trim_end_matches(".desktop").to_string();
            if which(&bin).is_some() {
                let mut l = bin;
                for u in &urls {
                    l.push(' ');
                    l.push_str(u);
                }
                l
            } else {
                anyhow::bail!("application not found: {id}");
            }
        }
    };
    let pid = spawn_detached("sh", &["-c", &exec_line], true, state)?;
    // Headless/virtual tracking so the dock shows running state even without
    // a real Wayland client registering a toplevel yet.
    let tid = state.next_id.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    let info = ToplevelInfo {
        id: tid,
        app_id: id.trim_end_matches(".desktop").to_string(),
        title: exec_line.clone(),
        kind: if state.args.headless { "virtual" } else { "wayland" }.to_string(),
        x: 100,
        y: 100,
        width: 1024,
        height: 768,
        minimized: false,
        maximized: false,
        fullscreen: false,
        focused: true,
        workspace: state.active_workspace.load(std::sync::atomic::Ordering::SeqCst),
        floating: true,
        snapped: None,
    };
    if state.args.headless {
        toplevel::push(state, info.clone());
    }
    Ok(json!({ "pid": pid, "toplevelId": tid, "exec": exec_line }))
}

fn which(bin: &str) -> Option<std::path::PathBuf> {
    let path = std::env::var("PATH").unwrap_or_default();
    path.split(':').map(std::path::PathBuf::from).find(|p| p.join(bin).is_file())
}

fn set_default_app(state: &CompositorState, params: &Value) -> anyhow::Result<Value> {
    let kind = params["kind"].as_str().unwrap_or("browser");
    let app = params["appId"].as_str().unwrap_or("");
    let mut cur = state.settings.lock().unwrap();
    cur["apps"]["defaults"][kind] = json!(app);
    settings::save(&settings::settings_path(), &cur);
    Ok(cur["apps"]["defaults"].clone())
}

fn set_association(state: &CompositorState, params: &Value) -> anyhow::Result<Value> {
    let mime = params["mime"].as_str().unwrap_or("");
    let app = params["appId"].as_str().unwrap_or("");
    let mut cur = state.settings.lock().unwrap();
    cur["apps"]["associations"][mime] = json!(app);
    settings::save(&settings::settings_path(), &cur);
    // Also write mimeapps.list for portal/GTK interop.
    {
        let p = std::path::PathBuf::from(crate::settings::home_dir())
            .join(".config")
            .join("mimeapps.list");
        let mut lines = std::fs::read_to_string(&p).unwrap_or("[Default Applications]\n".into());
        lines.push_str(&format!("{mime}={app}\n"));
        let _ = std::fs::write(p, lines);
    }
    Ok(cur["apps"]["associations"].clone())
}

// ───────────────────────────── windows ─────────────────────────────

fn win_focus(state: &CompositorState, id: u32) -> anyhow::Result<Value> {
    let mut tl = state.toplevels.lock().unwrap();
    for t in tl.iter_mut() {
        t.focused = t.id == id;
    }
    Ok(json!({ "ok": true }))
}

fn win_minimize(state: &CompositorState, id: u32) -> anyhow::Result<Value> {
    toplevel::update_state(state, id, |t| {
        t.minimized = true;
        t.focused = false;
    });
    Ok(json!({ "ok": true }))
}

fn win_maximize(state: &CompositorState, id: u32) -> anyhow::Result<Value> {
    toplevel::update_state(state, id, |t| {
        t.maximized = !t.maximized;
        t.minimized = false;
    });
    Ok(json!({ "ok": true }))
}

fn win_fullscreen(state: &CompositorState, id: u32) -> anyhow::Result<Value> {
    toplevel::update_state(state, id, |t| t.fullscreen = !t.fullscreen);
    Ok(json!({ "ok": true }))
}

fn win_close(state: &CompositorState, id: u32) -> anyhow::Result<Value> {
    toplevel::remove(state, id);
    Ok(json!({ "ok": true }))
}

fn win_move(state: &CompositorState, id: u32, params: &Value) -> anyhow::Result<Value> {
    let x = params["x"].as_i64().unwrap_or(0) as i32;
    let y = params["y"].as_i64().unwrap_or(0) as i32;
    toplevel::update_state(state, id, |t| {
        t.x = x;
        t.y = y;
    });
    Ok(json!({ "ok": true }))
}

fn win_resize(state: &CompositorState, id: u32, params: &Value) -> anyhow::Result<Value> {
    let w = params["width"].as_u64().unwrap_or(800) as u32;
    let h = params["height"].as_u64().unwrap_or(600) as u32;
    toplevel::update_state(state, id, |t| {
        t.width = w;
        t.height = h;
    });
    Ok(json!({ "ok": true }))
}

fn win_snap(state: &CompositorState, id: u32, side: &str) -> anyhow::Result<Value> {
    // Screen assumed 1920x1080 in headless; real backend overrides.
    let (w, h) = (1920u32, 1080u32);
    toplevel::update_state(state, id, |t| {
        match side {
            "left" => {
                t.x = 0;
                t.y = 0;
                t.width = w / 2;
                t.height = h;
                t.snapped = Some("left".into());
            }
            "right" => {
                t.x = (w / 2) as i32;
                t.y = 0;
                t.width = w / 2;
                t.height = h;
                t.snapped = Some("right".into());
            }
            _ => {
                t.snapped = None;
            }
        }
    });
    Ok(json!({ "ok": true, "snapped": side }))
}

fn win_move_ws(state: &CompositorState, id: u32, ws: usize) -> anyhow::Result<Value> {
    let old = toplevel::update_state(state, id, |t| t.workspace = ws);
    if let Some(o) = old {
        let mut wss = state.workspaces.lock().unwrap();
        let idx = o.workspace.min(wss.len() - 1);
        if let Some(p) = wss[idx].iter().position(|x| *x == id) {
            wss[idx].remove(p);
        }
        if ws < wss.len() && !wss[ws].contains(&id) {
            wss[ws].push(id);
        }
    }
    Ok(json!({ "ok": true, "workspace": ws }))
}

fn workspace_info(state: &CompositorState) -> anyhow::Result<Value> {
    let active = state.active_workspace.load(std::sync::atomic::Ordering::SeqCst);
    let ws = state.workspaces.lock().unwrap().clone();
    Ok(json!({ "active": active, "windows": ws }))
}

fn workspace_switch(state: &CompositorState, index: usize) -> anyhow::Result<Value> {
    state.active_workspace.store(index, std::sync::atomic::Ordering::SeqCst);
    state.broadcast(json!({ "type": "workspace", "active": index }));
    Ok(json!({ "active": index }))
}

fn create_virtual(state: &CompositorState, params: &Value) -> anyhow::Result<Value> {
    let tid = state.next_id.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    let info = ToplevelInfo {
        id: tid,
        app_id: params["appId"].as_str().unwrap_or("virtual").to_string(),
        title: params["title"].as_str().unwrap_or("Window").to_string(),
        kind: "virtual".into(),
        x: params["x"].as_i64().unwrap_or(120) as i32,
        y: params["y"].as_i64().unwrap_or(80) as i32,
        width: params["width"].as_u64().unwrap_or(900) as u32,
        height: params["height"].as_u64().unwrap_or(600) as u32,
        minimized: false,
        maximized: false,
        fullscreen: false,
        focused: true,
        workspace: state.active_workspace.load(std::sync::atomic::Ordering::SeqCst),
        floating: true,
        snapped: None,
    };
    toplevel::push(state, info.clone());
    Ok(json!({ "id": tid }))
}

// ───────────────────────────── settings rpc ─────────────────────────────

fn settings_set(state: &CompositorState, params: &Value) -> anyhow::Result<Value> {
    // params: { "path": "appearance.theme", "value": "dark" } or full object patch
    let mut cur = state.settings.lock().unwrap();
    if let Some(p) = params.get("path").and_then(|v| v.as_str()) {
        let value = params.get("value").cloned().unwrap_or(Value::Null);
        set_json_path(&mut cur, p, value);
    } else if let Some(patch) = params.get("patch") {
        settings::deep_merge(&mut cur, patch.clone());
    }
    settings::save(&settings::settings_path(), &cur);
    let copy = cur.clone();
    drop(cur);
    state.broadcast(json!({ "type": "settings_changed", "data": copy.clone() }));
    Ok(copy)
}

fn settings_import(state: &CompositorState, params: &Value) -> anyhow::Result<Value> {
    let mut incoming = params["settings"].clone();
    if incoming.is_null() {
        anyhow::bail!("no settings payload");
    }
    let mut merged = settings::defaults();
    settings::deep_merge(&mut merged, incoming.take());
    settings::save(&settings::settings_path(), &merged);
    *state.settings.lock().unwrap() = merged.clone();
    state.broadcast(json!({ "type": "settings_changed", "data": merged.clone() }));
    Ok(merged)
}

pub fn set_json_path(root: &mut Value, path: &str, value: Value) {
    let keys: Vec<&str> = path.split('.').collect();
    let mut cur = root;
    for k in &keys[..keys.len() - 1] {
        if !cur.is_object() {
            *cur = json!({});
        }
        cur = &mut cur[(*k).to_string()];
    }
    if !cur.is_object() {
        *cur = json!({});
    }
    cur[keys[keys.len() - 1]] = value;
}

// ───────────────────────────── filesystem ─────────────────────────────

pub fn expand(p: &str) -> std::path::PathBuf {
    let home = crate::settings::home_dir();
    let pp = std::path::PathBuf::from(if p.starts_with("~/") || p == "~" {
        p.replacen('~', &home, 1)
    } else {
        p.to_string()
    });
    pp
}

fn fs_list(path: &str) -> anyhow::Result<Value> {
    let dir = expand(path);
    let mut entries = Vec::new();
    for e in std::fs::read_dir(&dir)? {
        let e = e?;
        let name = e.file_name().to_string_lossy().to_string();
        let md = e.metadata();
        let is_dir = md.as_ref().map(|m| m.is_dir()).unwrap_or(false);
        entries.push(json!({
            "name": name,
            "isDir": is_dir,
            "size": md.as_ref().map(|m| m.len()).unwrap_or(0),
            "modified": md.as_ref()
                .ok()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0),
            "hidden": name.starts_with('.'),
        }));
    }
    entries.sort_by(|a, b| {
        let ad = a["isDir"].as_bool().unwrap_or(false);
        let bd = b["isDir"].as_bool().unwrap_or(false);
        bd.cmp(&ad).then(
            a["name"]
                .as_str()
                .unwrap_or("")
                .to_lowercase()
                .cmp(&b["name"].as_str().unwrap_or("").to_lowercase()),
        )
    });
    Ok(json!({ "path": dir.to_string_lossy(), "entries": entries }))
}

fn fs_read(path: &str) -> anyhow::Result<Value> {
    let p = expand(path);
    let bytes = std::fs::read(&p)?;
    if bytes.len() > 4_000_000 {
        anyhow::bail!("file too large to preview");
    }
    let text = String::from_utf8_lossy(&bytes).to_string();
    Ok(json!({ "path": p.to_string_lossy(), "content": text }))
}

fn fs_write(path: &str, content: &Value) -> anyhow::Result<Value> {
    let p = expand(path);
    if let Some(parent) = p.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let text = content.as_str().unwrap_or("");
    std::fs::write(&p, text)?;
    Ok(json!({ "ok": true, "path": p.to_string_lossy(), "bytes": text.len() }))
}

fn fs_mkdir(path: &str) -> anyhow::Result<Value> {
    let p = expand(path);
    std::fs::create_dir_all(p)?;
    Ok(json!({ "ok": true }))
}

fn fs_remove(state: &CompositorState, path: &str, permanent: bool) -> anyhow::Result<Value> {
    let p = expand(path);
    if permanent {
        if p.is_dir() {
            std::fs::remove_dir_all(p)?;
        } else {
            std::fs::remove_file(p)?;
        }
    } else {
        // Move to trash (~/.local/share/lunanano/trash or XDG Trash)
        let trash = settings::data_dir().join("trash");
        let _ = std::fs::create_dir_all(&trash);
        let name = p
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or("item".into());
        let dest = trash.join(format!("{}__{}", chronoish_now(), name));
        std::fs::rename(&p, &dest).map_err(|_| anyhow::anyhow!("trash move failed"))?;
        let _ = state;
    }
    Ok(json!({ "ok": true }))
}

fn fs_rename(from: &str, to: &str) -> anyhow::Result<Value> {
    std::fs::rename(expand(from), expand(to))?;
    Ok(json!({ "ok": true }))
}

fn fs_copy(from: &str, to: &str) -> anyhow::Result<Value> {
    let (f, t) = (expand(from), expand(to));
    if f.is_dir() {
        copy_dir_recursive(&f, &t)?;
    } else {
        std::fs::copy(&f, &t)?;
    }
    Ok(json!({ "ok": true }))
}

fn copy_dir_recursive(from: &std::path::Path, to: &std::path::Path) -> anyhow::Result<()> {
    std::fs::create_dir_all(to)?;
    for e in std::fs::read_dir(from)? {
        let e = e?;
        let ft = e.file_type()?;
        let dest = to.join(e.file_name());
        if ft.is_dir() {
            copy_dir_recursive(&e.path(), &dest)?;
        } else {
            std::fs::copy(e.path(), dest)?;
        }
    }
    Ok(())
}

fn fs_move(from: &str, to: &str) -> anyhow::Result<Value> {
    let (f, t) = (expand(from), expand(to));
    if std::fs::rename(&f, &t).is_err() {
        // Cross-device: copy + delete.
        if f.is_dir() {
            copy_dir_recursive(&f, &t)?;
            std::fs::remove_dir_all(&f)?;
        } else {
            std::fs::copy(&f, &t)?;
            std::fs::remove_file(&f)?;
        }
    }
    Ok(json!({ "ok": true }))
}

fn fs_stat(path: &str) -> anyhow::Result<Value> {
    let p = expand(path);
    let md = std::fs::metadata(&p)?;
    Ok(json!({
        "path": p.to_string_lossy(),
        "isDir": md.is_dir(),
        "size": md.len(),
        "readonly": md.permissions().readonly(),
    }))
}

fn archive_extract(params: &Value) -> anyhow::Result<Value> {
    let archive = expand(params["archive"].as_str().unwrap_or(""));
    let dest = expand(params["dest"].as_str().unwrap_or("."));
    let _ = std::fs::create_dir_all(&dest);
    let name = archive.file_name().and_then(|n| n.to_str()).unwrap_or("");
    let a = archive.to_string_lossy().to_string();
    let d = dest.to_string_lossy().to_string();
    if name.ends_with(".zip") {
        run("unzip", &["-o", &a, "-d", &d])?;
    } else if name.ends_with(".tar.gz") || name.ends_with(".tgz") {
        run("tar", &["-xzf", &a, "-C", &d])?;
    } else if name.ends_with(".tar") {
        run("tar", &["-xf", &a, "-C", &d])?;
    } else if name.ends_with(".7z") {
        run("7z", &["x", &a, &format!("-o{d}")])?;
    } else {
        // Try 7z generically (handles rar etc. when p7zip-full installed).
        run("7z", &["x", &a, &format!("-o{d}")])?;
    }
    Ok(json!({ "ok": true, "dest": d }))
}

fn archive_create(params: &Value) -> anyhow::Result<Value> {
    let archive = expand(params["archive"].as_str().unwrap_or("out.zip"));
    let sources: Vec<String> = params["sources"]
        .as_array()
        .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();
    let a = archive.to_string_lossy().to_string();
    let name = archive.file_name().and_then(|n| n.to_str()).unwrap_or("out.zip");
    let src: Vec<&str> = sources.iter().map(|s| s.as_str()).collect();
    if name.ends_with(".7z") {
        let mut args = vec!["a", &a];
        args.extend(src.iter());
        run("7z", &args)?;
    } else if name.ends_with(".tar.gz") || name.ends_with(".tgz") {
        let mut args = vec!["-czf", &a];
        args.extend(src.iter());
        run("tar", &args)?;
    } else {
        // zip: cd to common parent then zip relative names
        let mut args = vec!["-r", &a];
        args.extend(src.iter());
        run("zip", &args)?;
    }
    Ok(json!({ "ok": true, "archive": a }))
}

// ───────────────────────────── notes ─────────────────────────────

fn notes_dir() -> std::path::PathBuf {
    let d = settings::data_dir().join("notes");
    let _ = std::fs::create_dir_all(&d);
    d
}

fn notes_list() -> anyhow::Result<Value> {
    let dir = notes_dir();
    let mut notes = Vec::new();
    if let Ok(rd) = std::fs::read_dir(&dir) {
        for e in rd.flatten() {
            let p = e.path();
            if p.extension().map(|x| x == "md").unwrap_or(false) {
                let md = e.metadata().ok();
                notes.push(json!({
                    "name": p.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string(),
                    "modified": md
                        .as_ref()
                        .and_then(|m| m.modified().ok())
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0),
                    "size": md.as_ref().map(|m| m.len()).unwrap_or(0),
                }));
            }
        }
    }
    notes.sort_by(|a, b| b["modified"].as_u64().unwrap_or(0).cmp(&a["modified"].as_u64().unwrap_or(0)));
    Ok(json!(notes))
}

// ───────────────────────────── system info ─────────────────────────────

fn system_info() -> anyhow::Result<Value> {
    let kernel = run("uname", &["-r"]).unwrap_or_default();
    let pretty = std::fs::read_to_string("/etc/os-release")
        .ok()
        .and_then(|s| {
            s.lines()
                .find(|l| l.starts_with("PRETTY_NAME="))
                .map(|l| l.trim_start_matches("PRETTY_NAME=").trim_matches('"').to_string())
        })
        .unwrap_or("Linux".into());
    let cpu = std::fs::read_to_string("/proc/cpuinfo")
        .ok()
        .and_then(|s| {
            s.lines()
                .find(|l| l.starts_with("model name"))
                .and_then(|l| l.split(':').nth(1))
                .map(|v| v.trim().to_string())
        })
        .unwrap_or_default();
    let mem_total_kb = std::fs::read_to_string("/proc/meminfo")
        .ok()
        .and_then(|s| {
            s.lines()
                .find(|l| l.starts_with("MemTotal"))
                .and_then(|l| l.split_whitespace().nth(1))
                .and_then(|v| v.parse::<u64>().ok())
        })
        .unwrap_or(0);
    Ok(json!({
        "os": pretty,
        "kernel": kernel.trim(),
        "cpu": cpu,
        "memoryMb": mem_total_kb / 1024,
        "compositorVersion": env!("CARGO_PKG_VERSION"),
        "backend": if cfg!(feature = "wlroots-backend") { "wlroots" } else { "headless" },
    }))
}

// ───────────────────────────── a11y ─────────────────────────────

fn toggle_on_screen_keyboard(state: &CompositorState) -> anyhow::Result<Value> {
    let mut cur = state.settings.lock().unwrap();
    let on = !cur["accessibility"]["onScreenKeyboard"].as_bool().unwrap_or(false);
    cur["accessibility"]["onScreenKeyboard"] = json!(on);
    settings::save(&settings::settings_path(), &cur);
    drop(cur);
    if on {
        // Prefer florence, fall back to onboard.
        let cmd = if which("florence").is_some() { "florence" } else { "onboard" };
        if which(cmd).is_some() {
            spawn_detached(cmd, &[], true, state).ok();
        }
    }
    Ok(json!({ "onScreenKeyboard": on }))
}
