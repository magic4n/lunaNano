use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use anyhow::Result;
use tokio::sync::mpsc;

pub struct PtySession {
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Box<dyn Write + Send>,
}

#[derive(Clone)]
pub struct PtyManager {
    sessions: Arc<Mutex<HashMap<String, PtySession>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn spawn(
        &self,
        session_id: &str,
        cols: u16,
        rows: u16,
        shell: &str,
        data_tx: mpsc::UnboundedSender<(String, String)>,
    ) -> Result<()> {
        let pty_system = native_pty_system();
        let pair = pty_system.openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;

        let mut cmd = CommandBuilder::new(shell);
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");

        let _child = pair.slave.spawn_command(cmd)?;

        let mut reader = pair.master.try_clone_reader()?;
        let writer = pair.master.take_writer()?;

        let sid = session_id.to_string();
        let sid_read = sid.clone();

        // Spawn background reader thread for this PTY
        thread::spawn(move || {
            let mut buf = [0u8; 4096];
            while let Ok(n) = reader.read(&mut buf) {
                if n == 0 {
                    break;
                }
                let text = String::from_utf8_lossy(&buf[..n]).to_string();
                if data_tx.send((sid_read.clone(), text)).is_err() {
                    break;
                }
            }
        });

        let mut lock = self.sessions.lock().unwrap();
        lock.insert(
            sid,
            PtySession {
                master: pair.master,
                writer,
            },
        );

        Ok(())
    }

    pub fn write(&self, session_id: &str, data: &str) -> Result<()> {
        let mut lock = self.sessions.lock().unwrap();
        if let Some(session) = lock.get_mut(session_id) {
            session.writer.write_all(data.as_bytes())?;
            session.writer.flush()?;
        }
        Ok(())
    }

    pub fn resize(&self, session_id: &str, cols: u16, rows: u16) -> Result<()> {
        let mut lock = self.sessions.lock().unwrap();
        if let Some(session) = lock.get_mut(session_id) {
            session.master.resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })?;
        }
        Ok(())
    }

    pub fn kill(&self, session_id: &str) {
        let mut lock = self.sessions.lock().unwrap();
        lock.remove(session_id);
    }
}
