use serde::{Deserialize, Serialize};
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaylandToplevel {
    pub id: String,
    pub title: String,
    pub app_id: String,
    pub workspace_id: u32,
    pub focused: bool,
    pub fullscreen: Option<bool>,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaylandWorkspace {
    pub id: u32,
    pub name: String,
    pub active: bool,
    pub windows_count: u32,
}

pub struct WaylandCompositor {
    pub xwayland_process: Option<Child>,
    pub toplevels: Arc<Mutex<Vec<WaylandToplevel>>>,
    pub active_window_id: Arc<Mutex<Option<String>>>,
    pub workspaces: Arc<Mutex<Vec<WaylandWorkspace>>>,
}

impl WaylandCompositor {
    pub fn new() -> Self {
        let workspaces = vec![
            WaylandWorkspace { id: 1, name: "1".into(), active: true, windows_count: 0 },
            WaylandWorkspace { id: 2, name: "2".into(), active: false, windows_count: 0 },
            WaylandWorkspace { id: 3, name: "3".into(), active: false, windows_count: 0 },
            WaylandWorkspace { id: 4, name: "4".into(), active: false, windows_count: 0 },
        ];

        Self {
            xwayland_process: None,
            toplevels: Arc::new(Mutex::new(Vec::new())),
            active_window_id: Arc::new(Mutex::new(None)),
            workspaces: Arc::new(Mutex::new(workspaces)),
        }
    }

    pub fn start_xwayland(&mut self, display_num: u32) {
        let display_arg = format!(":{}", display_num);
        let child = Command::new("Xwayland")
            .args([&display_arg, "-rootless", "-terminate"])
            .spawn();

        if let Ok(c) = child {
            println!("XWayland server started on display {}", display_arg);
            self.xwayland_process = Some(c);
        }
    }

    #[allow(dead_code)]
    pub fn add_toplevel(&self, toplevel: WaylandToplevel) {
        let mut lock = self.toplevels.lock().unwrap();
        lock.push(toplevel);
    }

    pub fn focus_window(&self, id: &str) {
        let mut toplevels = self.toplevels.lock().unwrap();
        for tl in toplevels.iter_mut() {
            tl.focused = tl.id == id;
        }
        let mut active = self.active_window_id.lock().unwrap();
        *active = Some(id.to_string());
    }

    pub fn close_window(&self, id: &str) {
        let mut toplevels = self.toplevels.lock().unwrap();
        toplevels.retain(|tl| tl.id != id);
        let mut active = self.active_window_id.lock().unwrap();
        if active.as_deref() == Some(id) {
            *active = toplevels.last().map(|tl| tl.id.clone());
        }
    }

    pub fn switch_workspace(&self, ws_id: u32) {
        let mut workspaces = self.workspaces.lock().unwrap();
        for ws in workspaces.iter_mut() {
            ws.active = ws.id == ws_id;
        }
    }
}
