import { create } from 'zustand';
import { WaylandToplevel } from '../types/system';

export type BuiltInAppId = 'terminal' | 'calculator' | 'explorer' | 'notepad' | 'settings' | 'launcher';

export interface AppWindow {
  id: string;
  type: 'built-in' | 'native';
  appId: string;
  title: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isMaximized: boolean;
  isFocused: boolean;
  zIndex: number;
  initialProps?: any;
}

interface WindowStoreState {
  windows: AppWindow[];
  activeWindowId: string | null;
  maxZIndex: number;
  isLauncherOpen: boolean;
  isLockScreenOpen: boolean;
  isSwitcherOpen: boolean;
  switcherIndex: number;
  isScreenshotOverlayOpen: boolean;
  screenshotMode: 'fullscreen' | 'region' | 'window';
  
  // Actions
  openApp: (appId: string, title?: string, icon?: string, props?: any) => string;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindowPosition: (id: string, x: number, y: number) => void;
  updateWindowSize: (id: string, width: number, height: number) => void;
  snapWindow: (id: string, position: 'left' | 'right' | 'top' | 'bottom' | 'fullscreen') => void;
  syncNativeToplevels: (toplevels: WaylandToplevel[], activeId: string | number | null) => void;
  
  // Overlays
  toggleLauncher: (open?: boolean) => void;
  toggleLockScreen: (open?: boolean) => void;
  toggleSwitcher: (open?: boolean) => void;
  cycleSwitcher: (direction: 1 | -1) => void;
  openScreenshotOverlay: (mode?: 'fullscreen' | 'region' | 'window') => void;
  closeScreenshotOverlay: () => void;
}

const DEFAULT_WINDOW_SIZES: Record<string, { width: number; height: number; title: string; icon: string }> = {
  terminal: { width: 800, height: 500, title: 'Terminal', icon: 'terminal' },
  calculator: { width: 340, height: 480, title: 'Calculator', icon: 'calculate' },
  explorer: { width: 900, height: 580, title: 'Files', icon: 'folder' },
  notepad: { width: 820, height: 550, title: 'Notes', icon: 'edit_note' },
  settings: { width: 940, height: 640, title: 'Settings', icon: 'settings' },
  chromium: { width: 1024, height: 700, title: 'Chromium', icon: 'public' },
};

export const useWindowStore = create<WindowStoreState>((set, get) => ({
  windows: [],
  activeWindowId: null,
  maxZIndex: 10,
  isLauncherOpen: false,
  isLockScreenOpen: false,
  isSwitcherOpen: false,
  switcherIndex: 0,
  isScreenshotOverlayOpen: false,
  screenshotMode: 'fullscreen',

  openApp: (appId, title, icon, props) => {
    const { windows, maxZIndex } = get();
    // If window already exists and is minimized, restore it
    const existing = windows.find((w) => w.appId === appId && w.type === 'built-in');
    if (existing) {
      set({
        windows: windows.map((w) =>
          w.id === existing.id
            ? { ...w, isMinimized: false, isFocused: true, zIndex: maxZIndex + 1 }
            : { ...w, isFocused: false }
        ),
        activeWindowId: existing.id,
        maxZIndex: maxZIndex + 1,
        isLauncherOpen: false,
      });
      return existing.id;
    }

    const def = DEFAULT_WINDOW_SIZES[appId] || { width: 700, height: 500, title: appId, icon: 'apps' };
    const screenW = window.innerWidth || 1280;
    const screenH = window.innerHeight || 800;
    
    // Offset each new window slightly
    const offset = (windows.length % 6) * 32;
    const x = Math.max(40, (screenW - def.width) / 2 + offset);
    const y = Math.max(40, (screenH - def.height) / 2 + offset - 40);

    const newId = `win-${appId}-${Date.now()}`;
    const newWindow: AppWindow = {
      id: newId,
      type: 'built-in',
      appId,
      title: title || def.title,
      icon: icon || def.icon,
      x,
      y,
      width: def.width,
      height: def.height,
      isMinimized: false,
      isMaximized: false,
      isFocused: true,
      zIndex: maxZIndex + 1,
      initialProps: props,
    };

    set({
      windows: [...windows.map((w) => ({ ...w, isFocused: false })), newWindow],
      activeWindowId: newId,
      maxZIndex: maxZIndex + 1,
      isLauncherOpen: false,
    });
    return newId;
  },

  closeWindow: (id) => {
    const { windows } = get();
    const remaining = windows.filter((w) => w.id !== id);
    const nextActive = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
    set({
      windows: remaining.map((w) => (w.id === nextActive ? { ...w, isFocused: true } : w)),
      activeWindowId: nextActive,
    });
  },

  minimizeWindow: (id) => {
    const { windows } = get();
    set({
      windows: windows.map((w) => (w.id === id ? { ...w, isMinimized: true, isFocused: false } : w)),
      activeWindowId: null,
    });
  },

  toggleMaximizeWindow: (id) => {
    const { windows } = get();
    set({
      windows: windows.map((w) => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w)),
    });
  },

  focusWindow: (id) => {
    const { windows, maxZIndex } = get();
    set({
      windows: windows.map((w) =>
        w.id === id
          ? { ...w, isFocused: true, isMinimized: false, zIndex: maxZIndex + 1 }
          : { ...w, isFocused: false }
      ),
      activeWindowId: id,
      maxZIndex: maxZIndex + 1,
    });
  },

  updateWindowPosition: (id, x, y) => {
    const { windows } = get();
    set({
      windows: windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    });
  },

  updateWindowSize: (id, width, height) => {
    const { windows } = get();
    set({
      windows: windows.map((w) => (w.id === id ? { ...w, width, height } : w)),
    });
  },

  snapWindow: (id, position) => {
    const { windows } = get();
    const screenW = window.innerWidth || 1280;
    const screenH = window.innerHeight || 800;
    const dockHeight = 76;
    const availH = screenH - dockHeight;

    let x = 0, y = 0, width = screenW, height = availH;
    let isMaximized = false;

    if (position === 'left') {
      width = screenW / 2;
    } else if (position === 'right') {
      x = screenW / 2;
      width = screenW / 2;
    } else if (position === 'top') {
      height = availH / 2;
    } else if (position === 'bottom') {
      y = availH / 2;
      height = availH / 2;
    } else if (position === 'fullscreen') {
      isMaximized = true;
    }

    set({
      windows: windows.map((w) =>
        w.id === id ? { ...w, x, y, width, height, isMaximized } : w
      ),
    });
  },

  syncNativeToplevels: (toplevels, activeId) => {
    const { windows, maxZIndex } = get();
    const builtInWindows = windows.filter((w) => w.type === 'built-in');

    const nativeWindows: AppWindow[] = toplevels.map((tl) => {
      const existing = windows.find((w) => w.id === String(tl.id));
      const screenW = window.innerWidth || 1280;
      const screenH = window.innerHeight || 800;

      return {
        id: String(tl.id),
        type: 'native',
        appId: tl.appId,
        title: tl.title || tl.appId,
        icon: tl.icon || 'window',
        x: existing?.x ?? (screenW - 900) / 2,
        y: existing?.y ?? (screenH - 600) / 2,
        width: existing?.width ?? 900,
        height: existing?.height ?? 600,
        isMinimized: false,
        isMaximized: tl.fullscreen || false,
        isFocused: tl.focused,
        zIndex: tl.focused ? maxZIndex + 1 : (existing?.zIndex ?? 5),
      };
    });

    set({
      windows: [...builtInWindows, ...nativeWindows],
      activeWindowId: activeId ? String(activeId) : get().activeWindowId,
    });
  },

  toggleLauncher: (open) => {
    set((state) => ({
      isLauncherOpen: open !== undefined ? open : !state.isLauncherOpen,
    }));
  },

  toggleLockScreen: (open) => {
    set((state) => ({
      isLockScreenOpen: open !== undefined ? open : !state.isLockScreenOpen,
    }));
  },

  toggleSwitcher: (open) => {
    set((state) => ({
      isSwitcherOpen: open !== undefined ? open : !state.isSwitcherOpen,
      switcherIndex: 0,
    }));
  },

  cycleSwitcher: (direction) => {
    const { windows, switcherIndex } = get();
    const visible = windows.filter((w) => !w.isMinimized);
    if (visible.length === 0) return;
    const next = (switcherIndex + direction + visible.length) % visible.length;
    set({ switcherIndex: next });
    get().focusWindow(visible[next].id);
  },

  openScreenshotOverlay: (mode = 'fullscreen') => {
    set({ isScreenshotOverlayOpen: true, screenshotMode: mode });
  },

  closeScreenshotOverlay: () => {
    set({ isScreenshotOverlayOpen: false });
  },
}));
