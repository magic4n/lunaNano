mod config;
mod desktop;
mod fs_ops;
mod ipc;
mod pty;
mod system;
mod wayland;

use anyhow::Result;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

use crate::ipc::IpcServer;
use crate::wayland::WaylandCompositor;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    let _ = tracing::subscriber::set_global_default(subscriber);

    info!("Starting LunaNano Wayland Compositor v0.1.0...");

    let args: Vec<String> = std::env::args().collect();
    let port = args
        .iter()
        .position(|a| a == "--port")
        .and_then(|idx| args.get(idx + 1))
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(4242);

    let enable_xwayland = !args.contains(&"--no-xwayland".to_string());

    let mut compositor = WaylandCompositor::new();
    if enable_xwayland {
        compositor.start_xwayland(1);
    }

    let compositor_shared = Arc::new(Mutex::new(compositor));
    let server = IpcServer::new(port, compositor_shared);

    info!("Compositor initialized, launching IPC bridge...");
    server.run().await?;

    Ok(())
}
