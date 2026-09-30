//! Toplevel window model shared between the backend and IPC layer.

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToplevelInfo {
    pub id: u32,
    pub app_id: String,
    pub title: String,
    /// "wayland" | "x11" (via XWayland) | "virtual"
    pub kind: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub minimized: bool,
    pub maximized: bool,
    pub fullscreen: bool,
    pub focused: bool,
    pub workspace: usize,
    pub floating: bool,
    /// Snap side if tiled: none/left/right/maximize-corner etc.
    pub snapped: Option<String>,
}

pub fn push(state: &crate::CompositorState, info: ToplevelInfo) {
    let mut tl = state.toplevels.lock().unwrap();
    tl.push(info.clone());
    let mut ws = state.workspaces.lock().unwrap();
    ws[info.workspace].push(info.id);
    drop(tl);
    drop(ws);
    state.broadcast(serde_json::json!({ "type": "toplevel_added", "data": info }));
}

pub fn update_state<F: FnOnce(&mut ToplevelInfo)>(
    state: &crate::CompositorState,
    id: u32,
    f: F,
) -> Option<ToplevelInfo> {
    let mut tl = state.toplevels.lock().unwrap();
    let it = tl.iter_mut().find(|t| t.id == id)?;
    f(it);
    let copy = it.clone();
    drop(tl);
    state.broadcast(serde_json::json!({ "type": "toplevel_updated", "data": copy }));
    Some(copy)
}

pub fn remove(state: &crate::CompositorState, id: u32) {
    let mut tl = state.toplevels.lock().unwrap();
    if let Some(pos) = tl.iter().position(|t| t.id == id) {
        let info = tl.remove(pos);
        let mut ws = state.workspaces.lock().unwrap();
        if let Some(p) = ws[info.workspace].iter().position(|x| *x == id) {
            ws[info.workspace].remove(p);
        }
        drop(tl);
        drop(ws);
        state.broadcast(serde_json::json!({ "type": "toplevel_removed", "id": id }));
    }
}

pub fn list(state: &crate::CompositorState) -> Vec<ToplevelInfo> {
    state.toplevels.lock().unwrap().clone()
}

pub fn find_by_app_id(state: &crate::CompositorState, app_id: &str) -> Vec<u32> {
    state
        .toplevels
        .lock()
        .unwrap()
        .iter()
        .filter(|t| t.app_id.eq_ignore_ascii_case(app_id))
        .map(|t| t.id)
        .collect()
}
