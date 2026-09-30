//! LunaNano compositor — entry point.
//!
//! Architecture:
//!  - `backend` module: Wayland/wlroots backend abstraction. The real wlroots
//!    implementation lives behind the `wlroots-backend` cargo feature (built in
//!    CI where libwlroots-dev is installed). A headless fallback keeps the IPC,
//!    PTY and session services fully functional for development/testing.
//!  - `ipc`: WebSocket server (JSON protocol) shared with the React shell.
//!  - `pty`: portable-pty based terminal sessions.
//!  - `session`: system integration (PipeWire, brightness, NetworkManager,
//!    BlueZ, power-profiles-daemon, timedate, locale, mako, grim/wf-recorder,
//!    clipboard history, freedesktop app launching).

mod appinfo;
mod backend;
mod ipc;
mod pty;
mod rpc;
mod session;
mod settings;
mod toplevel;

use std::sync::{Arc, Mutex};

use clap::Parser;

#[derive(Parser, Debug)]
#[command(name = "lunanano-compositor", version, about = "LunaNano Wayland compositor")]
pub struct Args {
    /// WebSocket IPC listen address
    #[arg(long, default_value = "127.0.0.1:9710")]
    pub ipc_addr: String,

    /// Path of the Wayland socket to export (WAYLAND_DISPLAY)
    #[arg(long, default_value = "/run/user/UID/lunanano-wayland-0")]
    pub socket: String,

    /// Headless mode (no DRM output); useful for CI / nested testing
    #[arg(long)]
    pub headless: bool,

    /// XWayland: enable/disable
    #[arg(long, default_value_t = true)]
    pub xwayland: bool,

    /// Do not spawn the React shell automatically
    #[arg(long)]
    pub no_shell: bool,
}

/// Global compositor state shared between backend, IPC and services.
pub struct CompositorState {
    pub args: Args,
    pub toplevels: Mutex<Vec<toplevel::ToplevelInfo>>,
    pub workspaces: Mutex<Vec<Vec<u32>>>, // per-workspace list of window ids
    pub active_workspace: std::sync::atomic::AtomicUsize,
    pub locked: std::sync::atomic::AtomicBool,
    pub next_id: std::sync::atomic::AtomicU32,
    pub clients_tx: tokio::sync::broadcast::Sender<String>,
    pub settings: Arc<Mutex<serde_json::Value>>,
    pub notifications: Mutex<Vec<serde_json::Value>>,
    pub clipboard_history: Mutex<Vec<String>>,
}

impl CompositorState {
    fn new(args: Args) -> Self {
        let settings_path = settings::settings_path();
        let loaded = settings::load(&settings_path);
        Self {
            args,
            toplevels: Mutex::new(Vec::new()),
            workspaces: Mutex::new(vec![Vec::new(), Vec::new(), Vec::new(), Vec::new()]),
            active_workspace: std::sync::atomic::AtomicUsize::new(0),
            locked: std::sync::atomic::AtomicBool::new(false),
            next_id: std::sync::atomic::AtomicU32::new(1),
            clients_tx: tokio::sync::broadcast::channel(512).0,
            settings: Arc::new(Mutex::new(loaded)),
            notifications: Mutex::new(Vec::new()),
            clipboard_history: Mutex::new(Vec::new()),
        }
    }

    fn broadcast(&self, msg: serde_json::Value) {
        let s = msg.to_string();
        let _ = self.clients_tx.send(s);
    }

    pub fn backend_name(&self) -> &'static str {
        if cfg!(feature = "wlroots-backend") && !self.args.headless {
            "wlroots"
        } else {
            "headless"
        }
    }
}

fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let mut args = Args::parse();
    // Replace UID placeholder in socket path.
    args.socket = args.socket.replace("UID", &unsafe { libc::getuid() }.to_string());
    let state = Arc::new(CompositorState::new(args));

    // Async runtime for IPC + services.
    let rt = tokio::runtime::Builder::new_multi_thread().enable_all().build()?;
    let _guard = rt.enter();

    tracing::info!("LunaNano compositor starting (headless={})", state.args.headless);

    // Backend: real wlroots when compiled with the feature, else headless stub.
    let backend = backend::create_backend(state.clone());
    backend.start()?;

    // Terminal PTY manager.
    let ptymgr = std::sync::Arc::new(pty::PtyManager::new(state.clone()));
    ptymgr.spawn_reader();
    pty::register(ptymgr);

    // Session services (audio/network/power/notifications/...).
    session::start_services(state.clone());

    // Settings hot reload watcher.
    settings::spawn_watcher(state.clone());

    // WebSocket IPC server (blocks this thread's runtime via rt).
    let ipc_state = state.clone();
    let addr = state.args.ipc_addr.clone();
    rt.block_on(async move {
        ipc::serve(ipc_state, &addr).await?;
        Ok::<_, anyhow::Error>(())
    })?;

    backend.stop();
    Ok(())
}
