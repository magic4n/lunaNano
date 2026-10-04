import { create } from 'zustand';
import { LunaSettings } from '../types/ipc';

export const DEFAULT_SETTINGS: LunaSettings = {
  appearance: {
    wallpaper: 'linear-gradient(135deg, #0d0f14 0%, #151922 50%, #08090d 100%)',
    wallpaperMode: 'static',
    themeMode: 'dark',
    dynamicPalette: true,
    colorScheme: 'tonalSpot',
    customAccent: '#6750A4',
    fontFamily: 'Montserrat',
    uiScale: 1.0,
    cornerRadius: 16,
    animations: true,
    animationSpeed: 1.0,
    reducedMotion: false,
    uiSounds: true,
  },
  dock: {
    iconSize: 52,
    autoHide: false,
    position: 'bottom',
    magnificationPower: 1.35,
    showSeparators: true,
    pinnedApps: ['launcher', 'terminal', 'explorer', 'notepad', 'calculator', 'chromium', 'settings'],
  },
  workspaces: {
    orientation: 'vertical',
    swipeGesture: true,
    count: 4,
  },
  apps: {
    defaultBrowser: 'chromium',
    defaultTerminal: 'terminal',
    defaultEditor: 'notepad',
    associations: {
      'text/plain': 'notepad',
      'text/markdown': 'notepad',
      'application/json': 'notepad',
      'inode/directory': 'explorer',
    },
  },
  terminal: {
    fontFamily: 'JetBrains Mono',
    fontSize: 14,
    theme: 'catppuccin-mocha',
    transparency: 0.92,
    cursorStyle: 'bar',
    cursorBlink: true,
    historySize: 5000,
    shell: '/bin/bash',
  },
  calculator: {
    mode: 'standard',
    historyPersistence: true,
  },
  explorer: {
    viewMode: 'grid',
    sortBy: 'name',
    sortOrder: 'asc',
    showHidden: false,
    bookmarks: ['/home', '/tmp', '/media', '/mnt'],
  },
  notepad: {
    storagePath: '~/.local/share/lunanano/notes/',
    theme: 'system',
    autoSaveIntervalMs: 2000,
    defaultTags: ['Personal', 'Work', 'Ideas', 'Todos'],
  },
  notifications: {
    timeoutMs: 5000,
    doNotDisturb: false,
    grouping: true,
    position: 'top-right',
    historyLimit: 50,
  },
  sound: {
    masterVolume: 75,
    masterMute: false,
    inputVolume: 80,
    inputMute: false,
    appStreams: [],
    equalizerPreset: 'Balanced',
  },
  network: {
    wifiEnabled: true,
    bluetoothEnabled: true,
  },
  power: {
    profile: 'balanced',
    sleepTimeoutMin: 30,
  },
  dateTime: {
    format24h: true,
    showSeconds: false,
    timezone: 'UTC',
    useNtp: true,
  },
  language: {
    layouts: ['us', 'ru'],
    activeLayout: 'us',
    switchShortcut: 'Alt+Shift',
  },
  users: {
    currentUsername: 'user',
    allUsers: ['user', 'root'],
  },
  privacy: {
    cameraActive: false,
    microphoneActive: false,
    appPermissions: {},
  },
  keybindings: {
    'Super': 'launcher',
    'Super+Enter': 'terminal',
    'Super+e': 'explorer',
    'Super+l': 'lockscreen',
    'Super+d': 'dock',
    'Alt+Tab': 'switcher',
    'Super+ArrowUp': 'snap-top',
    'Super+ArrowDown': 'minimize',
    'Super+ArrowLeft': 'snap-left',
    'Super+ArrowRight': 'snap-right',
    'Super+q': 'close',
    'Super+m': 'minimize',
  },
  accessibility: {
    largeText: false,
    highContrast: false,
    onScreenKeyboard: false,
    screenReader: false,
  },
};

interface SettingsStoreState {
  settings: LunaSettings;
  setSettings: (settings: LunaSettings) => void;
  updateSettings: (patch: Partial<LunaSettings>) => void;
  resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  settings: DEFAULT_SETTINGS,
  setSettings: (settings) => set({ settings }),
  updateSettings: (patch) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...patch,
        appearance: { ...state.settings.appearance, ...(patch.appearance || {}) },
        dock: { ...state.settings.dock, ...(patch.dock || {}) },
        workspaces: { ...state.settings.workspaces, ...(patch.workspaces || {}) },
        apps: { ...state.settings.apps, ...(patch.apps || {}) },
        terminal: { ...state.settings.terminal, ...(patch.terminal || {}) },
        calculator: { ...state.settings.calculator, ...(patch.calculator || {}) },
        explorer: { ...state.settings.explorer, ...(patch.explorer || {}) },
        notepad: { ...state.settings.notepad, ...(patch.notepad || {}) },
        notifications: { ...state.settings.notifications, ...(patch.notifications || {}) },
        sound: { ...state.settings.sound, ...(patch.sound || {}) },
        network: { ...state.settings.network, ...(patch.network || {}) },
        power: { ...state.settings.power, ...(patch.power || {}) },
        dateTime: { ...state.settings.dateTime, ...(patch.dateTime || {}) },
        language: { ...state.settings.language, ...(patch.language || {}) },
        privacy: { ...state.settings.privacy, ...(patch.privacy || {}) },
        accessibility: { ...state.settings.accessibility, ...(patch.accessibility || {}) },
      },
    })),
  resetToDefaults: () => set({ settings: DEFAULT_SETTINGS }),
}));
