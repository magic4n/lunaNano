import React, { useEffect } from 'react';
import { useIpcStore } from './stores/ipcStore';
import { useWindowStore, AppWindow } from './stores/windowStore';
import { useSettingsStore } from './stores/settingsStore';
import { generateM3ThemeFromHex, applyThemeTokens } from './theme/materialColor';

import { Dock } from './components/dock/Dock';
import { WindowFrame } from './components/window/WindowFrame';
import { LauncherApp } from './apps/Launcher/LauncherApp';
import { TerminalApp } from './apps/Terminal/TerminalApp';
import { CalculatorApp } from './apps/Calculator/CalculatorApp';
import { ExplorerApp } from './apps/Explorer/ExplorerApp';
import { NotepadApp } from './apps/Notepad/NotepadApp';
import { SettingsApp } from './apps/Settings/SettingsApp';

import { LockScreen } from './components/lockscreen/LockScreen';
import { WindowSwitcher } from './components/switcher/WindowSwitcher';
import { ScreenshotOverlay } from './components/screenshot/ScreenshotOverlay';
import { NotificationOverlay } from './components/notifications/NotificationOverlay';
import { OnScreenKeyboard } from './components/a11y/OnScreenKeyboard';

export const App: React.FC = () => {
  const { connect, send } = useIpcStore();
  const { 
    windows, 
    activeWindowId, 
    openApp, 
    closeWindow, 
    minimizeWindow, 
    toggleLauncher, 
    toggleLockScreen, 
    snapWindow 
  } = useWindowStore();
  const { settings } = useSettingsStore();

  // Connect to Rust Compositor IPC on mount
  useEffect(() => {
    connect();
  }, [connect]);

  // Apply Theme & M3 tokens on mount or settings change
  useEffect(() => {
    const isDark = settings.appearance.themeMode !== 'light';
    const accent = settings.appearance.customAccent || '#6750A4';
    const theme = generateM3ThemeFromHex(accent);
    applyThemeTokens(isDark ? theme.dark : theme.light, isDark);

    // Apply corner radius to document body
    document.documentElement.style.setProperty(
      '--luna-screen-radius',
      `${settings.appearance.cornerRadius || 16}px`
    );
  }, [settings.appearance.themeMode, settings.appearance.customAccent, settings.appearance.cornerRadius]);

  // Global Hotkey handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isSuper = e.metaKey || e.getModifierState('Meta');

      // Super alone: Launcher
      if (e.key === 'Meta') {
        e.preventDefault();
        toggleLauncher();
        return;
      }

      if (isSuper) {
        if (e.key === 'Enter') {
          e.preventDefault();
          openApp('terminal');
        } else if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          openApp('explorer');
        } else if (e.key === 'l' || e.key === 'L') {
          e.preventDefault();
          toggleLockScreen(true);
        } else if (e.key === 'q' || e.key === 'Q') {
          e.preventDefault();
          if (activeWindowId) closeWindow(activeWindowId);
        } else if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          if (activeWindowId) minimizeWindow(activeWindowId);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (activeWindowId) snapWindow(activeWindowId, 'fullscreen');
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (activeWindowId) minimizeWindow(activeWindowId);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (activeWindowId) snapWindow(activeWindowId, 'left');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (activeWindowId) snapWindow(activeWindowId, 'right');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeWindowId, openApp, closeWindow, minimizeWindow, snapWindow, toggleLauncher, toggleLockScreen]);

  const renderWindowContent = (win: AppWindow) => {
    switch (win.appId) {
      case 'terminal':
        return <TerminalApp initialCommand={win.initialProps?.command} />;
      case 'calculator':
        return <CalculatorApp />;
      case 'explorer':
        return <ExplorerApp />;
      case 'notepad':
        return <NotepadApp />;
      case 'settings':
        return <SettingsApp />;
      case 'chromium':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] p-8 text-center select-none">
            <span className="material-symbols-outlined text-6xl text-[var(--md-sys-color-primary)] mb-3 animate-pulse">
              public
            </span>
            <h3 className="text-base font-bold mb-1">Chromium Wayland Window</h3>
            <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] max-w-md mb-4 leading-relaxed">
              External toplevel window managed by LunaNano Wayland Compositor. Native surface renders directly underneath this frame.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => send({ type: 'apps:launch', exec: 'chromium' })}
                className="px-4 py-2 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] text-xs font-semibold shadow-md active:scale-95"
              >
                Launch Native Chromium
              </button>
            </div>
          </div>
        );
      default:
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] p-6 text-center select-none">
            <span className="material-symbols-outlined text-5xl text-[var(--md-sys-color-primary)] mb-2">
              {win.icon || 'window'}
            </span>
            <h4 className="text-sm font-bold">{win.title}</h4>
            <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-1">Native Wayland Toplevel Window</p>
          </div>
        );
    }
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none"
      style={{
        background: settings.appearance.wallpaper,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Windows Canvas */}
      <div className="absolute inset-0 overflow-hidden">
        {windows.map((win) => (
          <WindowFrame key={win.id} window={win}>
            {renderWindowContent(win)}
          </WindowFrame>
        ))}
      </div>

      {/* Dock at bottom */}
      <Dock />

      {/* System Overlays */}
      <LauncherApp />
      <LockScreen />
      <WindowSwitcher />
      <ScreenshotOverlay />
      <NotificationOverlay />
      <OnScreenKeyboard />
    </div>
  );
};

export default App;
