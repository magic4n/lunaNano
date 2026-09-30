//! Terminal PTY sessions via portable-pty.
//!
//! The React shell opens a terminal "app" and calls `pty.open` over IPC; raw
//! bytes are streamed as base64 in `pty.data` events keyed by session id.

use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};

use base64::Engine as _;
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};

use crate::CompositorState;

struct Session {
    writer: Box<dyn Write + Send>,
    child: Box<dyn portable_pty::Child + Send + Sync>,
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
}

pub struct PtyManager {
    state: Arc<CompositorState>,
    sessions: Arc<Mutex<HashMap<u32, Session>>>,
    next: AtomicU32,
}

impl PtyManager {
    pub fn new(state: Arc<CompositorState>) -> Self {
        Self {
            state,
            sessions: Arc::new(Mutex::new(HashMap::new())),
            next: AtomicU32::new(1),
        }
    }

    /// Spawn a shell inside a new PTY. Returns session id.
    pub fn open(&self, cols: u16, rows: u16, shell: Option<String>) -> anyhow::Result<u32> {
        let shell = shell
            .unwrap_or_else(|| std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string()));
        let pty_system = native_pty_system();
        let pair = pty_system.openpty(PtySize {
            rows: rows.max(1),
            cols: cols.max(1),
            pixel_width: 0,
            pixel_height: 0,
        })?;

        let mut cmd = CommandBuilder::new(&shell);
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");

        let child = pair.slave.spawn_command(cmd)?;
        let reader = pair.master.try_clone_reader()?;
        let writer = pair.master.take_writer()?;
        let master = Arc::new(Mutex::new(pair.master));

        let id = self.next.fetch_add(1, Ordering::SeqCst);
        self.sessions.lock().unwrap().insert(
            id,
            Session {
                writer,
                child,
                master,
            },
        );

        // Reader thread → broadcast pty.data events.
        let tx = self.state.clients_tx.clone();
        let sessions = self.sessions.clone();
        std::thread::spawn(move || {
            let mut reader = reader;
            let mut buf = [0u8; 8192];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        let b64 = base64::engine::general_purpose::STANDARD.encode(&buf[..n]);
                        let msg =
                            serde_json::json!({ "type": "pty.data", "id": id, "data": b64 })
                                .to_string();
                        let _ = tx.send(msg);
                    }
                }
            }
            sessions.lock().unwrap().remove(&id);
            let msg = serde_json::json!({ "type": "pty.closed", "id": id }).to_string();
            let _ = tx.send(msg);
        });

        Ok(id)
    }

    pub fn write(&self, id: u32, data: &[u8]) -> anyhow::Result<()> {
        let mut sessions = self.sessions.lock().unwrap();
        let s = sessions
            .get_mut(&id)
            .ok_or_else(|| anyhow::anyhow!("no such pty session {id}"))?;
        s.writer.write_all(data)?;
        s.writer.flush()?;
        Ok(())
    }

    pub fn resize(&self, id: u32, cols: u16, rows: u16) -> anyhow::Result<()> {
        let sessions = self.sessions.lock().unwrap();
        let s = sessions
            .get(&id)
            .ok_or_else(|| anyhow::anyhow!("no such pty session {id}"))?;
        s.master.lock().unwrap().resize(PtySize {
            rows: rows.max(1),
            cols: cols.max(1),
            pixel_width: 0,
            pixel_height: 0,
        })?;
        Ok(())
    }

    pub fn close(&self, id: u32) {
        let mut sessions = self.sessions.lock().unwrap();
        if let Some(mut s) = sessions.remove(&id) {
            let _ = s.child.kill();
        }
    }

    /// No-op kept for API symmetry with main.rs wiring.
    pub fn spawn_reader(&self) {}
}

/// Global lazy holder so RPC handlers can reach the PTY manager.
pub struct PtyHolder {
    inner: Mutex<Option<Arc<PtyManager>>>,
}

pub static PTY_HOLDER: PtyHolder = PtyHolder {
    inner: Mutex::new(None),
};

pub fn register(manager: Arc<PtyManager>) {
    *PTY_HOLDER.inner.lock().unwrap() = Some(manager);
}

pub fn manager() -> anyhow::Result<Arc<PtyManager>> {
    PTY_HOLDER
        .inner
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| anyhow::anyhow!("pty manager not initialised"))
}
