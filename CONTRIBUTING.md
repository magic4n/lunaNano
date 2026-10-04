# Contributing to LunaNano 🌙

[English](CONTRIBUTING.md) | [Русский](CONTRIBUTING_RU.md)

Thank you for your interest in contributing to **LunaNano**! We welcome contributions from developers, designers, and testers worldwide.

---

## 🛠️ Codebase Structure

LunaNano is organized into a modular monorepo:

- **`compositor/`**: Native Rust Wayland compositor.
  - `src/main.rs`: Entry point and CLI arguments.
  - `src/wayland.rs`: Wayland compositor protocols and XWayland integration.
  - `src/ipc.rs`: Asynchronous WebSocket server (`127.0.0.1:4242`).
  - `src/pty.rs`: Linux PTY terminal sessions (`portable-pty`).
  - `src/system.rs`: System integrations (PipeWire, network, brightness, power).
  - `src/fs_ops.rs`: High-performance filesystem operations and archive management.
  - `src/config.rs`: Settings persistence (`~/.config/lunanano/settings.json`).
- **`src/`**: Standalone React Desktop Shell.
  - `components/dock/`: Bottom dock pill capsules and Quick Settings panel.
  - `components/window/`: Window frame decorator and snap preview engine.
  - `apps/`: Built-in applications (Terminal, Calculator, Explorer, Notepad, Settings, Launcher).
  - `theme/`: Material You 3 dynamic color extraction and Web Audio sound effects.
  - `stores/`: Zustand state management stores (`windowStore`, `ipcStore`, `settingsStore`).
- **`packaging/`**: Debian packaging and system session scripts (`lunanano-session`, `.desktop`, `greetd`).

---

## 📋 Development Workflow

### 1. Prerequisites
- Linux with Wayland support
- Rust 1.75+
- Node.js 18+ and `npm`

### 2. Setting Up the Development Environment
```bash
# Clone the repository
git clone https://github.com/superluna/lunaNano.git
cd lunaNano

# Install frontend dependencies
npm install

# Run type check
npx tsc --noEmit

# Check Rust compositor
cargo check -p lunanano-compositor
```

### 3. Coding Guidelines
- **UI & Aesthetics**: Use Material You 3 design standards with official `@material/web` elements and `@material/material-color-utilities`.
- **Zero Browser Dependencies**: Ensure all shell features run autonomously inside the dedicated native layer surface.
- **Type Safety**: Strictly type all React components and IPC messages. Do not use `any` unless strictly required for external FFI.
- **Testing Builds**: Verify compilation using `cargo check` and `npx tsc --noEmit` before opening pull requests.

### 4. Submitting a Pull Request
1. Fork the repository and create your feature branch:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. Commit your changes following Conventional Commits (`feat:`, `fix:`, `docs:`, `perf:`):
   ```bash
   git commit -m "feat(dock): add custom capsule animation"
   ```
3. Push to your branch and open a Pull Request against `main`.
4. Ensure CI checks pass on GitHub Actions.

---

## 📜 License Notice

By contributing to LunaNano, you agree that your contributions will be licensed under the **GNU General Public License v3.0** (GPLv3).
