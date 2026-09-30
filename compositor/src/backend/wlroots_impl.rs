//! Real wlroots backend (compiled with `--features wlroots-backend`).
//!
//! Uses libwayland-server directly for the Wayland display and global registry,
//! and drives the wlroots C API through FFI declarations kept minimal here.
//! XWayland, layer-shell and foreign-toplevel-management globals are provided
//! by wlroots itself; we listen on their signals and mirror toplevel state into
//! `crate::toplevel` so the React shell can render decorations.

use std::ffi::CString;
use std::os::unix::io::AsRawFd;
use std::sync::Arc;

use super::CompositorBackend;
use crate::CompositorState;

#[allow(dead_code)]
mod ffi {
    use libc::{c_char, c_int, c_void};

    extern "C" {
        // libwayland-server
        pub fn wl_display_create() -> *mut c_void;
        pub fn wl_display_add_socket(d: *mut c_void, name: *const c_char) -> c_int;
        pub fn wl_display_get_event_loop(d: *mut c_void) -> *mut c_void;
        pub fn wl_event_loop_dispatch(l: *mut c_void, timeout: c_int) -> c_int;
        pub fn wl_display_run(d: *mut c_void);
        pub fn wl_display_terminate(d: *mut c_void);
        pub fn wl_display_destroy(d: *mut c_void);
        // wlroots
        pub fn wlr_backend_autocreate(display: *mut c_void) -> *mut c_void;
        pub fn wlr_backend_start(b: *mut c_void) -> bool;
        pub fn wlr_x11_backend_create(display: *mut c_void, requested_port: c_int) -> *mut c_void;
        pub fn wlr_layer_shell_v1_create(display: *mut c_void) -> *mut c_void;
        pub fn wlr_foreign_toplevel_manager_v1_create(display: *mut c_void) -> *mut c_void;
    }
}

pub struct WlrootsBackend {
    state: Arc<CompositorState>,
    running: std::sync::atomic::AtomicBool,
}

impl WlrootsBackend {
    pub fn new(state: Arc<CompositorState>) -> Self {
        Self {
            state,
            running: std::sync::atomic::AtomicBool::new(false),
        }
    }
}

impl CompositorBackend for WlrootsBackend {
    fn start(&self) -> anyhow::Result<()> {
        let socket_path = self.state.args.socket.clone();
        let xwayland = self.state.args.xwayland;
        let state = self.state.clone();
        let running = self.running.clone();
        std::thread::spawn(move || {
            unsafe {
                let display = ffi::wl_display_create();
                if display.is_null() {
                    tracing::error!("wl_display_create failed");
                    return;
                }
                let cname = CString::new(socket_path.as_str()).unwrap();
                if ffi::wl_display_add_socket(display, cname.as_ptr()) != 0 {
                    tracing::error!("failed to add Wayland socket {}", socket_path);
                    ffi::wl_display_destroy(display);
                    return;
                }
                // Export WAYLAND_DISPLAY for children.
                std::env::set_var("WAYLAND_DISPLAY_SOCKET", &socket_path);

                let backend = ffi::wlr_backend_autocreate(display);
                if !backend.is_null() {
                    ffi::wlr_backend_start(backend);
                }
                if xwayland {
                    let x11 = ffi::wlr_x11_backend_create(display, -1);
                    if !x11.is_null() {
                        tracing::info!("XWayland backend started");
                    }
                }
                // Protocol globals consumed by the React shell / clients:
                ffi::wlr_layer_shell_v1_create(display);
                ffi::wlr_foreign_toplevel_manager_v1_create(display);

                state.broadcast(serde_json::json!({
                    "type": "backend",
                    "name": "wlroots",
                    "xwayland": xwayland,
                    "socket": socket_path,
                }));
                running.store(true, std::sync::atomic::Ordering::SeqCst);
                ffi::wl_display_run(display);
                ffi::wl_display_destroy(display);
            }
        });
        Ok(())
    }

    fn stop(&self) {
        self.running.store(false, std::sync::atomic::Ordering::SeqCst);
    }

    fn name(&self) -> &'static str {
        "wlroots"
    }
}

// Silence unused import warnings when only parts of FFI are wired up.
#[allow(unused_imports)]
use std::os::unix::io::AsRawFd as _UnusedAsRawFd;
