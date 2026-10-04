# LunaNano 🌙

> **Ultra-lightweight aesthetic Wayland Desktop Shell built with React, TypeScript & Material You 3, powered by a high-performance Rust compositor with XWayland support.**

---

## 🌟 Overview

**LunaNano** is a complete, standalone desktop environment designed as a modern, minimalist alternative to GNOME and KDE. The user interacts exclusively with a fullscreen React-powered interface without native legacy desktop panels.

- **Frontend Shell**: Fullscreen React 18 + Vite + TypeScript application running via Tauri / layer-shell.
- **Wayland Compositor**: High-performance Rust compositor built on wlroots / Smithay protocols with native **XWayland** support for seamless X11 compatibility.
- **True Material You 3 (M3)**: Built using official `@material/web` components and `@material/material-color-utilities` dynamic palette generation extracted from wallpaper, synced to GTK4 and Qt apps via `org.freedesktop.portal.Settings`.
- **Bidirectional WebSocket IPC**: Ultra-low latency event and command bus (`127.0.0.1:4242`) connecting the compositor and React shell.
- **Embedded PTY Engine**: Real interactive terminal sessions powered by `portable-pty` and `xterm.js`.
- **Foreign Toplevel Management**: External applications (such as Chromium, LibreOffice, GIMP) run as native Wayland/X11 toplevels while window decorations, titlebars, and controls are rendered in the React layer.

---

## 🚀 Key Features

### 🖥️ Bottom Dock (Pill Capsules)
- **Modular Floating Capsules**: 100% pill-rounded containers with frosted glass blur and M3 elevations.
- **Hover Magnification**: macOS-inspired scaling with spring physics (`framer-motion`).
- **Genie Window Animation**: Windows collapse smoothly into their dock icon capsule upon minimization.
- **Interactive Badges**: Running dot indicators, unread notification counter badges, and operation progress rings.
- **Mouse Controls**:
  - **LMB**: Open / Minimize / Focus.
  - **RMB**: Context menu (New Window, Pin/Unpin, Close, Info).
  - **MMB (Middle Click)**: Spawn new application instance.
  - **Scroll Wheel**: Cycle between windows of the same application.
  - **Drag & Drop**: Reorder dock capsules dynamically.
- **Integrated System Capsule**: Master audio slider, Wi-Fi status, battery percentage, and 12/24h clock.

---

### 📦 Built-in React Applications
All internal applications run inside the shell's routing canvas:
1. **Terminal**:
   - `xterm.js` with `FitAddon` and `WebLinksAddon`.
   - Connected to Rust `portable-pty` over WebSocket.
   - Customizable fonts, themes, opacity, and cursor styles.
2. **Calculator**:
   - Standard arithmetic, percentage, inversion, and memory functions (`MC`, `MR`, `M+`, `M-`).
   - Calculation history drawer.
   - Full keyboard navigation.
3. **File Explorer**:
   - Real filesystem operations via native IPC bridge.
   - Path breadcrumbs, search, grid and list views, bookmarks sidebar.
   - File manipulation: copy, cut, paste, rename, delete.
   - Archive extraction and compression for `.zip`, `.tar.gz`, and `.7z` with M3 progress dialogs.
4. **Notepad**:
   - Split-pane and full-preview Markdown editor powered by `marked`.
   - Autosave to `~/.local/share/lunanano/notes/`.
   - Tag filtering, search, and Markdown / HTML exports.
5. **Settings**:
   - Complete settings suite covering all 21 system categories: Appearance, Dock, Workspaces, Default Apps, Terminal, Calculator, File Explorer, Notepad, Notifications, Sound (PipeWire / WirePlumber mixer), Network (Wi-Fi `nmcli` & Bluetooth `bluetoothctl`), Power (`powerprofilesctl`), Date & Time (NTP), Keyboard Layouts, Multi-User, Privacy & Permissions, Updates, Keybindings, Accessibility (High Contrast, Large Text, Screen Reader, On-Screen Keyboard), About System, and Profile Export/Import (`~/.config/lunanano/settings.json`) with hot reload.
6. **Launcher**:
   - Fullscreen app launcher overlay with fuzzy search and category filtering.

---

### 🌐 System Integrations
- **Audio**: PipeWire & WirePlumber master volume and per-app streams.
- **Brightness**: `brightnessctl` per-monitor brightness control.
- **Networking**: `nmcli` Wi-Fi scanning and connection manager.
- **Bluetooth**: `bluetoothctl` pairing, connection, and Obex file transfers.
- **Power**: `power-profiles-daemon` (`power-saver`, `balanced`, `performance`).
- **Notifications**: Mako / D-Bus notification daemon with React toast overlay.
- **Clipboard**: `wl-clipboard` (`wl-copy`, `wl-paste`) with history manager.
- **Captures**: `grim` + `slurp` for screenshots and `wf-recorder` for video recording.
- **Lock Screen**: React lock screen (Super+L) with clock, battery, and PIN unlock.
- **Greeter**: `greetd` login manager session.
- **Accessibility**: Built-in On-Screen Virtual Keyboard, high-contrast, and large-text toggles.

---

## ⌨️ Default Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Super` | Open / Close Application Launcher |
| `Super + Enter` | Open Terminal |
| `Super + E` | Open File Explorer |
| `Super + L` | Lock Screen |
| `Super + Q` | Close Active Window |
| `Super + M` | Minimize Active Window |
| `Super + Up` | Maximize / Snap Top |
| `Super + Down` | Minimize Active Window |
| `Super + Left` | Snap Window Left (Half Screen) |
| `Super + Right` | Snap Window Right (Half Screen) |
| `Alt + Tab` | Window Switcher Carousel |

---

## 🛠️ Installation & Building

### Requirements
- Linux (Ubuntu 24.04, Debian 12+, Arch Linux, or Fedora)
- Rust 1.75+ (`rustc`, `cargo`)
- Node.js 18+ and `npm`
- Wayland libraries: `libwayland-dev`, `wayland-protocols`, `libxkbcommon-dev`, `xwayland`
- Desktop utilities: `pipewire`, `wireplumber`, `brightnessctl`, `network-manager`, `bluez`, `power-profiles-daemon`, `wl-clipboard`, `grim`, `slurp`, `wf-recorder`

---

### Install from Debian Package (.deb)
Download the `.deb` package from [Releases](https://github.com/superluna/lunaNano/releases) or build it locally:

```bash
sudo dpkg -i artifacts/lunanano_0.1.0_amd64.deb
sudo apt-get install -f
```

---

### Building from Source

1. **Clone the repository**:
   ```bash
   git clone https://github.com/superluna/lunaNano.git
   cd lunaNano
   ```

2. **Install frontend dependencies & build bundle**:
   ```bash
   npm ci
   npm run build
   ```

3. **Build the Rust Compositor**:
   ```bash
   cargo build --release -p lunanano-compositor
   ```

4. **Package the `.deb` file**:
   ```bash
   ./packaging/build-deb.sh
   ```
   The generated package will be saved in `artifacts/lunanano_0.1.0_<arch>.deb`.

---

## 🚀 Running LunaNano

### 1. As a Display Manager Session (GDM, SDDM, greetd, LightDM)
Select **LunaNano** from the session menu on your login screen.

### 2. From Virtual Console (TTY)
```bash
lunanano-session
```

### 3. Development / Nested Mode
You can test the shell inside an existing Wayland or X11 session:
```bash
# Terminal 1: Run Compositor
cargo run --release -p lunanano-compositor

# Terminal 2: Run React Shell
npm run dev
```
Open `http://localhost:5173` in your browser or run Chromium in kiosk mode.

---

## ⚙️ Configuration

Configuration is stored in `~/.config/lunanano/settings.json`. The compositor watches this file using `notify` and automatically hot-reloads configuration changes across all connected shell clients without restarting the session.

---

## 📄 License
MIT License © superLuna Ecosystem
