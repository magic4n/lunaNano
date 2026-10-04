# LunaNano 🌙

> **Ultra-lightweight aesthetic Standalone Wayland Desktop Shell built with React, TypeScript & Material You 3, powered by a high-performance Rust compositor with XWayland support.**

---

## 🌟 Overview

**LunaNano** is a 100% standalone, fullscreen desktop environment designed as a complete replacement for GNOME, KDE, or Hyprland.

**Important**: LunaNano does **NOT** run inside a web browser and requires **zero** external browsers (no Chrome, Chromium, or Firefox needed). Upon starting the session, the user is greeted by a dedicated native fullscreen shell surface running directly over the Wayland compositor display server.

- **Standalone Frontend Shell**: Native fullscreen shell binary (`lunanano-shell`) rendering React 18 + Vite + TypeScript directly onto Wayland layer surfaces using native WebKitGTK / Tauri without external browser processes.
- **Wayland Compositor**: High-performance Rust compositor built with wlroots / Smithay protocols with native **XWayland** support for seamless X11 application compatibility.
- **True Material You 3 (M3 Expressive)**: Built using official `@material/web` components and `@material/material-color-utilities` dynamic palette generation extracted from wallpaper, synchronized to GTK4 and Qt apps via `org.freedesktop.portal.Settings`.
- **Bidirectional WebSocket IPC**: Ultra-low latency event and command bus (`127.0.0.1:4242`) connecting the Rust compositor and React shell.
- **Embedded PTY Engine**: Real interactive terminal sessions powered by `portable-pty` and `xterm.js`.
- **Foreign Toplevel Management**: External applications run as native Wayland/X11 toplevels while window decorations, titlebars, and controls are rendered in the React layer.

---

## 🚀 Key Features & Architecture

### 🖥️ Bottom Dock (100% Pill Capsules)
- **Modular Floating Capsules**: Completely rounded pill capsules with frosted glass blur, acrylic mica highlights, and M3 elevations.
- **macOS Gaussian Magnification**: Smooth bell-curve hover magnification powered by `framer-motion` spring physics.
- **Genie Window Animation**: Windows collapse and morph smoothly into their respective dock capsules upon minimization.
- **Badges & Progress**: Running dot indicators, unread notification counter badges, and archive operation progress indicators.
- **Media Player Capsule**: Real-time equalizer visualizer, track title marquee, and play/pause controls.
- **Quick Settings & Status Capsule**: Combined capsule displaying Wi-Fi, Bluetooth, PipeWire volume, battery status, and clock/date.
- **Interactive Mouse Controls**:
  - **LMB**: Open / Minimize / Focus.
  - **RMB**: Context menu (New Window, Pin/Unpin, Close All).
  - **MMB (Middle Click)**: Spawn new application instance.
  - **Scroll Wheel**: Switch between open windows of the same app.
  - **Drag & Drop**: Reorder dock capsules smoothly.

---

### 🎛️ Material You Quick Settings Control Center
Clicking the system capsule opens the slide-up Quick Settings panel:
- **Large Interactive M3 Pills**: Wi-Fi, Bluetooth, Dark/Light Mode, Do Not Disturb, Screenshot, and Night Light.
- **PipeWire Volume Slider**: Master volume control with mute toggle.
- **Screen Brightness Slider**: Hardware monitor backlight control (`brightnessctl`).
- **Power Profiles & Battery Health**: Performance, Balanced, and Power Saver (Eco) chips with CPU and RAM usage meters.
- **User & Session Actions**: Lock screen, full system settings, and power controls.

---

### 📦 Built-in React Applications

1. **Terminal**:
   - Multi-tab support (`+` new tab, close tab) for concurrent PTY sessions.
   - Connected directly to Rust `portable-pty` over WebSocket.
   - Integrated action bar: font scaling (`A-` / `A+`), clear screen, and command clipboard.
   - Status bar: active shell path (`/bin/bash`), geometry (cols × rows), and live PTY connection dot.
2. **Calculator**:
   - Standard and Scientific mode drawer (sin, cos, tan, √, xʸ, ln, log, π, e, 1/x).
   - Calculation history tape with recall, memory registers (`MC`, `MR`, `M+`, `M-`).
   - Tactile Material You pill keypad with haptic feedback.
3. **File Explorer**:
   - Real Linux filesystem operations via native IPC bridge.
   - Interactive breadcrumb navigation (click any path segment to jump).
   - Storage capacity meter in sidebar (used/free ext4 disk space).
   - Rich file type badges (code, archives, images, documents).
   - High-speed archive compression and extraction for `.zip`, `.tar.gz`, and `.7z` with real-time M3 progress dialogs.
4. **Notepad**:
   - Split-pane and live-preview Markdown editor powered by `marked`.
   - Markdown formatting toolbar: Bold, Italic, Headings, Code block, Quote, List, Links.
   - Live document statistics: Word count, character count, and estimated reading time.
   - Automatic background saving into `~/.local/share/lunanano/notes/`.
   - Tag taxonomy and export to `.md` or `.html`.
5. **Settings (All 21 Sections)**:
   - **Appearance**: Live dynamic wallpaper gallery with MCU color extraction, custom wallpaper URL/gradient, dark/light/auto mode, UI scale slider, screen corner radius, smooth animations, and UI sound effects.
   - **Dock, Workspaces, Default Apps, Terminal, Calculator, Explorer, Notepad, Notifications, Sound (PipeWire per-app mixer), Network (Wi-Fi & BT), Power, Date & Time (NTP), Keyboards, Users, Privacy, Updates, Shortcuts, Accessibility, About, and Profile Backup/Reset**.
6. **Launcher**:
   - Fullscreen app launcher overlay with fuzzy search and categorized freedesktop `.desktop` applications.

---

### 🌐 Standalone Hardware Integration
- **Audio**: PipeWire & WirePlumber master volume and per-app streams.
- **Brightness**: `brightnessctl` backlight control.
- **Networking**: `nmcli` Wi-Fi scanning and connection.
- **Bluetooth**: `bluetoothctl` pairing and device management.
- **Power**: `power-profiles-daemon` (`power-saver`, `balanced`, `performance`).
- **Notifications**: Mako / D-Bus notification daemon with React toast overlay.
- **Clipboard**: `wl-clipboard` (`wl-copy`, `wl-paste`) with history manager.
- **Captures**: `grim` + `slurp` for screenshots and `wf-recorder` for video recording.
- **Lock Screen**: React lock screen (Super+L) with clock, battery, and PIN unlock.
- **Greeter**: `greetd` login session.
- **Accessibility**: Built-in On-Screen Virtual Keyboard, high-contrast mode, and large text.

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
| `Super + Left` | Snap Window Left (50% screen) |
| `Super + Right` | Snap Window Right (50% screen) |
| `Alt + Tab` | Window Switcher Carousel |

---

## 🛠️ Installation & Setup

### Install from Debian Package (.deb)

LunaNano installs as a standalone display session:

```bash
sudo dpkg -i artifacts/lunanano_0.1.0_amd64.deb
sudo apt-get install -f
```

### Running LunaNano

#### 1. From Display Manager (GDM, SDDM, greetd, LightDM)
Select **LunaNano** from the session list on your login screen.

#### 2. From Virtual Console (TTY)
```bash
lunanano-session
```
The session initializes the Rust compositor, starts the IPC server on port `4242`, and immediately launches the standalone native shell on the screen.

---

## ⚙️ Configuration Format

Settings are saved in `~/.config/lunanano/settings.json`. The compositor monitors this file and hot-reloads changes dynamically across the shell without requiring a restart.

---

## 📄 License
MIT License © superLuna Ecosystem
