//! WebSocket IPC server — JSON protocol shared with the React shell.
//!
//! Client → server:
//!   { "type": "request", "id": 123, "method": "audio.get", "params": {...} }
//! Server → client:
//!   { "type": "response", "id": 123, "result": {...} }
//!   { "type": "<event>", ... }            // broadcasts (toplevel_*, pty.data…)
//!   { "type": "hello", "capabilities": [...] }

use std::sync::Arc;

use futures_util::{SinkExt, StreamExt};
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::tungstenite::Message;

use crate::CompositorState;

pub async fn serve(state: Arc<CompositorState>, addr: &str) -> anyhow::Result<()> {
    let listener = TcpListener::bind(addr).await?;
    tracing::info!("IPC websocket server listening on ws://{addr}");

    // Announce ourselves to late-connecting clients immediately after hello.
    loop {
        let (stream, peer) = listener.accept().await?;
        let state = state.clone();
        tokio::spawn(async move {
            if let Err(e) = handle_conn(stream, state).await {
                tracing::debug!("ipc conn {peer} closed: {e}");
            }
        });
    }
}

async fn handle_conn(stream: TcpStream, state: Arc<CompositorState>) -> anyhow::Result<()> {
    stream.set_nodelay(true).ok();
    let ws = tokio_tungstenite::accept_async(stream).await?;
    let (mut tx, mut rx) = ws.split();

    // Subscribe to broadcast events for this client.
    let mut rx_bcast = state.clients_tx.subscribe();
    let send_task = tokio::spawn(async move {
        while let Ok(msg) = rx_bcast.recv().await {
            if tx.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
        tx
    });

    // Initial snapshot so the shell renders instantly.
    let snapshot = serde_json::json!({
        "type": "hello",
        "compositorVersion": env!("CARGO_PKG_VERSION"),
        "backend": state.backend_name(),
        "toplevels": crate::toplevel::list(&state),
        "settings": state.settings.lock().unwrap().clone(),
        "workspace": state.active_workspace.load(std::sync::atomic::Ordering::SeqCst),
    });
    {
        // Send snapshot via a dedicated channel since tx moved into send_task:
        // we piggyback through the broadcast instead.
        let _ = &snapshot;
        let s = snapshot.to_string();
        let _ = state.clients_tx.send(s);
    }

    while let Some(Ok(msg)) = rx.next().await {
        match msg {
            Message::Text(t) => {
                let parsed: serde_json::Value = match serde_json::from_str(&t) {
                    Ok(v) => v,
                    Err(e) => {
                        let err = serde_json::json!({ "type": "error", "message": format!("bad json: {e}") });
                        let _ = state.clients_tx.send(err.to_string());
                        continue;
                    }
                };
                if parsed["type"].as_str() == Some("request") {
                    let id = parsed["id"].clone();
                    let method = parsed["method"].as_str().unwrap_or("").to_string();
                    let params = parsed.get("params").cloned().unwrap_or(serde_json::Value::Null);
                    let state2 = state.clone();
                    // Blocking RPC handlers run on the blocking pool.
                    tokio::task::spawn_blocking(move || {
                        let result = crate::rpc::dispatch(&state2, &method, &params);
                        let resp = serde_json::json!({ "type": "response", "id": id, "result": result });
                        let _ = state2.clients_tx.send(resp.to_string());
                    });
                } else if parsed["type"].as_str() == Some("ping") {
                    let _ = state.clients_tx.send(serde_json::json!({ "type": "pong" }).to_string());
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    drop(send_task);
    Ok(())
}
