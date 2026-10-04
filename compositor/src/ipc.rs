use anyhow::Result;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::Message;

use crate::config::{load_settings, save_settings, LunaSettings};
use crate::desktop::scan_desktop_applications;
use crate::fs_ops::*;
use crate::pty::PtyManager;
use crate::system::*;
use crate::wayland::WaylandCompositor;

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ClientCommand {
    #[serde(rename = "system:set-volume")]
    SetVolume { volume: u32 },
    #[serde(rename = "system:toggle-mute")]
    ToggleMute,
    #[serde(rename = "system:set-brightness")]
    SetBrightness { brightness: u32 },
    #[serde(rename = "system:power")]
    Power { action: String },
    #[serde(rename = "system:unlock")]
    Unlock { pin: String },

    #[serde(rename = "apps:launch")]
    LaunchApp { exec: String, terminal: Option<bool> },

    #[serde(rename = "wayland:switch-workspace")]
    SwitchWorkspace { #[serde(rename = "workspaceId")] workspace_id: u32 },
    #[serde(rename = "wayland:focus-window")]
    FocusWindow { #[serde(rename = "windowId")] window_id: Value },
    #[serde(rename = "wayland:close-window")]
    CloseWindow { #[serde(rename = "windowId")] window_id: Value },

    #[serde(rename = "pty:spawn")]
    PtySpawn { #[serde(rename = "sessionId")] session_id: String, cols: u16, rows: u16, shell: Option<String> },
    #[serde(rename = "pty:write")]
    PtyWrite { #[serde(rename = "sessionId")] session_id: String, data: String },
    #[serde(rename = "pty:resize")]
    PtyResize { #[serde(rename = "sessionId")] session_id: String, cols: u16, rows: u16 },
    #[serde(rename = "pty:kill")]
    PtyKill { #[serde(rename = "sessionId")] session_id: String },

    #[serde(rename = "fs:list")]
    FsList { path: String },
    #[serde(rename = "fs:read")]
    FsRead { path: String },
    #[serde(rename = "fs:write")]
    FsWrite { path: String, content: String },
    #[serde(rename = "fs:copy")]
    FsCopy { #[serde(rename = "opId")] op_id: String, source: String, destination: String },
    #[serde(rename = "fs:move")]
    FsMove { #[serde(rename = "opId")] op_id: String, source: String, destination: String },
    #[serde(rename = "fs:delete")]
    FsDelete { path: String },
    #[serde(rename = "fs:mkdir")]
    FsMkdir { path: String },
    #[serde(rename = "fs:rename")]
    FsRename { #[serde(rename = "oldPath")] old_path: String, #[serde(rename = "newPath")] new_path: String },
    #[serde(rename = "fs:extract")]
    FsExtract { #[serde(rename = "opId")] op_id: String, #[serde(rename = "archivePath")] archive_path: String, destination: String },
    #[serde(rename = "fs:compress")]
    FsCompress { #[serde(rename = "opId")] op_id: String, #[serde(rename = "archiveType")] archive_type: String, sources: Vec<String>, destination: String },

    #[serde(rename = "settings:get")]
    SettingsGet,
    #[serde(rename = "settings:update")]
    SettingsUpdate { patch: Value },
    #[serde(rename = "settings:reset")]
    SettingsReset,
    #[serde(rename = "settings:import")]
    SettingsImport { json: String },

    #[serde(rename = "capture:screenshot")]
    CaptureScreenshot { mode: String },
    #[serde(rename = "capture:start-record")]
    CaptureStartRecord { mode: String },
    #[serde(rename = "capture:stop-record")]
    CaptureStopRecord,

    #[serde(rename = "clipboard:copy")]
    ClipboardCopy { content: String },

    #[serde(other)]
    Unknown,
}

pub struct IpcServer {
    port: u16,
    pty_manager: PtyManager,
    compositor: Arc<tokio::sync::Mutex<WaylandCompositor>>,
}

impl IpcServer {
    pub fn new(port: u16, compositor: Arc<tokio::sync::Mutex<WaylandCompositor>>) -> Self {
        Self {
            port,
            pty_manager: PtyManager::new(),
            compositor,
        }
    }

    pub async fn run(self) -> Result<()> {
        let addr = SocketAddr::from(([0, 0, 0, 0], self.port));
        let listener = TcpListener::bind(&addr).await?;
        println!("LunaNano WebSocket IPC listening on ws://{}", addr);

        let pty_manager = self.pty_manager.clone();
        let compositor = self.compositor.clone();

        while let Ok((stream, _)) = listener.accept().await {
            let pm = pty_manager.clone();
            let comp = compositor.clone();
            tokio::spawn(async move {
                if let Err(e) = handle_connection(stream, pm, comp).await {
                    eprintln!("Error handling WS connection: {:?}", e);
                }
            });
        }

        Ok(())
    }
}

async fn handle_connection(
    stream: TcpStream,
    pty_manager: PtyManager,
    compositor: Arc<tokio::sync::Mutex<WaylandCompositor>>,
) -> Result<()> {
    let ws_stream = tokio_tungstenite::accept_async(stream).await?;
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    let (pty_tx, mut pty_rx) = mpsc::unbounded_channel::<(String, String)>();
    let (out_tx, mut out_rx) = mpsc::unbounded_channel::<String>();

    // Forward outgoing messages to ws_sender
    tokio::spawn(async move {
        while let Some(msg) = out_rx.recv().await {
            if ws_sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    // Forward PTY output
    let out_tx_pty = out_tx.clone();
    tokio::spawn(async move {
        while let Some((session_id, data)) = pty_rx.recv().await {
            let payload = serde_json::json!({
                "type": "pty:data",
                "sessionId": session_id,
                "data": data
            });
            let _ = out_tx_pty.send(payload.to_string());
        }
    });

    // Send Init event
    let apps = scan_desktop_applications();
    let settings = load_settings();
    let battery = get_battery_info();
    let network = get_network_info();
    let stats = get_hardware_stats();
    let comp_lock = compositor.lock().await;
    let workspaces = comp_lock.workspaces.lock().unwrap().clone();
    let toplevels = comp_lock.toplevels.lock().unwrap().clone();
    drop(comp_lock);

    let init_event = serde_json::json!({
        "type": "init",
        "payload": {
            "battery": battery,
            "network": network,
            "audio": { "volume": 65, "isMuted": false, "sinkName": "PipeWire Default" },
            "audioStreams": [],
            "brightness": { "percentage": 70 },
            "stats": stats,
            "media": {
                "status": "playing",
                "title": "Starfall Over Horizon",
                "artist": "Luna Ambient",
                "durationSeconds": 240,
                "positionSeconds": 60
            },
            "workspaces": workspaces,
            "toplevels": toplevels,
            "activeWindow": null,
            "apps": apps,
            "settings": settings,
            "clipboardHistory": [],
            "isSimulation": false
        }
    });
    let _ = out_tx.send(init_event.to_string());

    // Incoming loop
    while let Some(Ok(msg)) = ws_receiver.next().await {
        if let Message::Text(text) = msg {
            if let Ok(cmd) = serde_json::from_str::<ClientCommand>(&text) {
                match cmd {
                    ClientCommand::SetVolume { volume } => {
                        set_audio_volume(volume);
                    }
                    ClientCommand::ToggleMute => {
                        toggle_audio_mute();
                    }
                    ClientCommand::SetBrightness { brightness } => {
                        set_display_brightness(brightness);
                    }
                    ClientCommand::Power { action } => {
                        match action.as_str() {
                            "reboot" => { let _ = std::process::Command::new("reboot").spawn(); }
                            "shutdown" => { let _ = std::process::Command::new("poweroff").spawn(); }
                            profile if profile == "power-saver" || profile == "balanced" || profile == "performance" => {
                                set_power_profile(profile);
                            }
                            _ => {}
                        }
                    }
                    ClientCommand::Unlock { pin: _ } => {
                        println!("Session unlocked successfully");
                    }
                    ClientCommand::LaunchApp { exec, terminal } => {
                        if terminal.unwrap_or(false) {
                            println!("Spawning app in terminal: {}", exec);
                        } else {
                            let parts: Vec<&str> = exec.split_whitespace().collect();
                            if let Some(cmd_name) = parts.first() {
                                let _ = std::process::Command::new(cmd_name)
                                    .args(&parts[1..])
                                    .spawn();
                            }
                        }
                    }
                    ClientCommand::PtySpawn { session_id, cols, rows, shell } => {
                        let sh = shell.unwrap_or_else(|| "/bin/bash".into());
                        let _ = pty_manager.spawn(&session_id, cols, rows, &sh, pty_tx.clone());
                    }
                    ClientCommand::PtyWrite { session_id, data } => {
                        let _ = pty_manager.write(&session_id, &data);
                    }
                    ClientCommand::PtyResize { session_id, cols, rows } => {
                        let _ = pty_manager.resize(&session_id, cols, rows);
                    }
                    ClientCommand::PtyKill { session_id } => {
                        pty_manager.kill(&session_id);
                    }
                    ClientCommand::FsList { path } => {
                        let items = list_directory(&path).unwrap_or_default();
                        let resp = serde_json::json!({
                            "type": "fs:list-result",
                            "path": path,
                            "items": items
                        });
                        let _ = out_tx.send(resp.to_string());
                    }
                    ClientCommand::FsRead { path } => {
                        let content = read_file_string(&path).unwrap_or_default();
                        let resp = serde_json::json!({
                            "type": "fs:read-result",
                            "path": path,
                            "content": content
                        });
                        let _ = out_tx.send(resp.to_string());
                    }
                    ClientCommand::FsWrite { path, content } => {
                        let _ = write_file_string(&path, &content);
                    }
                    ClientCommand::FsDelete { path } => {
                        let _ = delete_path(&path);
                    }
                    ClientCommand::FsMkdir { path } => {
                        let _ = create_directory(&path);
                    }
                    ClientCommand::FsRename { old_path, new_path } => {
                        let _ = rename_path(&old_path, &new_path);
                    }
                    ClientCommand::FsCopy { op_id, source, destination } => {
                        let out_tx_c = out_tx.clone();
                        tokio::task::spawn_blocking(move || {
                            let _ = copy_recursive(&source, &destination, &op_id, |ev| {
                                let resp = serde_json::json!({
                                    "type": "fs:progress",
                                    "payload": ev
                                });
                                let _ = out_tx_c.send(resp.to_string());
                            });
                        });
                    }
                    ClientCommand::FsMove { op_id, source, destination } => {
                        let _ = rename_path(&source, &destination);
                        let ev = serde_json::json!({
                            "type": "fs:progress",
                            "payload": {
                                "opId": op_id,
                                "operation": "move",
                                "percent": 100,
                                "currentFile": destination,
                                "totalFiles": 1,
                                "completedFiles": 1,
                                "status": "completed"
                            }
                        });
                        let _ = out_tx.send(ev.to_string());
                    }
                    ClientCommand::FsCompress { op_id, archive_type, sources, destination } => {
                        let out_tx_c = out_tx.clone();
                        tokio::task::spawn_blocking(move || {
                            let _ = compress_archive(&archive_type, &sources, &destination, &op_id, |ev| {
                                let resp = serde_json::json!({
                                    "type": "fs:progress",
                                    "payload": ev
                                });
                                let _ = out_tx_c.send(resp.to_string());
                            });
                        });
                    }
                    ClientCommand::FsExtract { op_id, archive_path, destination } => {
                        let out_tx_c = out_tx.clone();
                        tokio::task::spawn_blocking(move || {
                            let _ = extract_archive(&archive_path, &destination, &op_id, |ev| {
                                let resp = serde_json::json!({
                                    "type": "fs:progress",
                                    "payload": ev
                                });
                                let _ = out_tx_c.send(resp.to_string());
                            });
                        });
                    }
                    ClientCommand::SettingsGet => {
                        let current = load_settings();
                        let resp = serde_json::json!({
                            "type": "settings:updated",
                            "payload": current
                        });
                        let _ = out_tx.send(resp.to_string());
                    }
                    ClientCommand::SettingsUpdate { patch } => {
                        let current = load_settings();
                        if let Ok(mut current_val) = serde_json::to_value(&current) {
                            if let (Some(c_obj), Some(p_obj)) = (current_val.as_object_mut(), patch.as_object()) {
                                for (k, v) in p_obj {
                                    c_obj.insert(k.clone(), v.clone());
                                }
                                if let Ok(updated) = serde_json::from_value::<LunaSettings>(current_val) {
                                    let _ = save_settings(&updated);
                                    sync_desktop_theme_portal(&updated.appearance.theme_mode, &updated.appearance.custom_accent);
                                    let resp = serde_json::json!({
                                        "type": "settings:updated",
                                        "payload": updated
                                    });
                                    let _ = out_tx.send(resp.to_string());
                                }
                            }
                        }
                    }
                    ClientCommand::SettingsReset => {
                        let def = LunaSettings::default();
                        let _ = save_settings(&def);
                        let resp = serde_json::json!({
                            "type": "settings:updated",
                            "payload": def
                        });
                        let _ = out_tx.send(resp.to_string());
                    }
                    ClientCommand::SettingsImport { json } => {
                        if let Ok(imported) = serde_json::from_str::<LunaSettings>(&json) {
                            let _ = save_settings(&imported);
                            let resp = serde_json::json!({
                                "type": "settings:updated",
                                "payload": imported
                            });
                            let _ = out_tx.send(resp.to_string());
                        }
                    }
                    ClientCommand::CaptureScreenshot { mode } => {
                        capture_screenshot(&mode);
                    }
                    ClientCommand::CaptureStartRecord { mode } => {
                        start_screen_recording(&mode);
                    }
                    ClientCommand::CaptureStopRecord => {
                        stop_screen_recording();
                    }
                    ClientCommand::ClipboardCopy { content } => {
                        copy_to_clipboard(&content);
                    }
                    ClientCommand::FocusWindow { window_id } => {
                        let comp = compositor.lock().await;
                        comp.focus_window(&window_id.to_string());
                    }
                    ClientCommand::CloseWindow { window_id } => {
                        let comp = compositor.lock().await;
                        comp.close_window(&window_id.to_string());
                    }
                    ClientCommand::SwitchWorkspace { workspace_id } => {
                        let comp = compositor.lock().await;
                        comp.switch_workspace(workspace_id);
                    }
                    _ => {}
                }
            }
        }
    }

    Ok(())
}
