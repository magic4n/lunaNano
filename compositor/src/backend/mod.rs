//! Backend abstraction.
//!
//! Two implementations:
//!  * `WlrootsBackend` (feature = "wlroots-backend"): real Wayland display via
//!    libwayland-server, with XWayland, wlr-layer-shell and
//!    wlr-foreign-toplevel-management provided by the wlroots C library. The
//!    Rust side owns the event loop and forwards toplevel lifecycle events to
//!    the IPC broadcast so the React shell can draw window decorations.
//!  * `HeadlessBackend` (default): a fully functional session manager without
//!    GPU/DRM — used for CI builds, nested development and testing of the IPC,
//!    PTY and system services. Launching apps still works (they run, PTY and
//!    RPC behave identically); windows are tracked as virtual toplevels.

use std::sync::Arc;

pub trait CompositorBackend: Send + Sync {
    fn start(&self) -> anyhow::Result<()>;
    fn stop(&self);
    fn name(&self) -> &'static str;
}

#[cfg(feature = "wlroots-backend")]
mod wlroots_impl;

#[cfg(feature = "wlroots-backend")]
pub fn create_backend(state: Arc<crate::CompositorState>) -> Arc<dyn CompositorBackend> {
    if state.args.headless {
        Arc::new(HeadlessBackend::new(state))
    } else {
        Arc::new(wlroots_impl::WlrootsBackend::new(state))
    }
}

#[cfg(not(feature = "wlroots-backend"))]
pub fn create_backend(state: Arc<crate::CompositorState>) -> Arc<dyn CompositorBackend> {
    Arc::new(HeadlessBackend::new(state))
}

pub struct HeadlessBackend {
    #[allow(dead_code)]
    state: Arc<crate::CompositorState>,
}

impl HeadlessBackend {
    pub fn new(state: Arc<crate::CompositorState>) -> Self {
        Self { state }
    }
}

impl CompositorBackend for HeadlessBackend {
    fn start(&self) -> anyhow::Result<()> {
        tracing::warn!(
            "Running HEADLESS backend (no DRM/Wayland socket). \
             Build with `--features wlroots-backend` and libwlroots-dev for a real compositor."
        );
        let s = self.state.clone();
        std::thread::spawn(move || {
            s.broadcast(serde_json::json!({
                "type": "backend",
                "name": "headless",
                "xwayland": false,
            }));
        });
        Ok(())
    }
    fn stop(&self) {}
    fn name(&self) -> &'static str {
        "headless"
    }
}
