import type { 
  AudioInfo, 
  BatteryInfo, 
  BrightnessInfo, 
  MediaPlayerInfo, 
  NetworkInfo, 
  NotificationItem, 
  SystemHardwareStats, 
  WaylandToplevel, 
  WaylandWorkspace 
} from './system';
import type { AppEntry, AppCategory } from './launcher';

export type { 
  AudioInfo, 
  BatteryInfo, 
  BrightnessInfo, 
  MediaPlayerInfo, 
  NetworkInfo, 
  NotificationItem, 
  SystemHardwareStats, 
  WaylandToplevel, 
  WaylandWorkspace,
  AppEntry,
  AppCategory
};

export interface AppAudioStream {
  id: string;
  name: string;
  appName: string;
  volume: number; // 0 - 100
  isMuted: boolean;
  icon?: string;
}

export interface FsItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: number;
  mimeType?: string;
  permissions?: string;
}

export interface FsProgressEvent {
  opId: string;
  operation: 'copy' | 'move' | 'delete' | 'extract' | 'compress';
  percent: number; // 0 - 100
  currentFile: string;
  totalFiles: number;
  completedFiles: number;
  status: 'running' | 'completed' | 'failed';
  error?: string;
}

export interface WifiNetwork {
  ssid: string;
  bssid: string;
  signal: number; // 0 - 100
  security: string;
  inUse: boolean;
}

export interface BluetoothDevice {
  address: string;
  name: string;
  connected: boolean;
  paired: boolean;
  icon?: string;
  batteryPercentage?: number;
}

export interface ClipboardItem {
  id: string;
  content: string;
  timestamp: number;
  mimeType: string;
}

export interface LunaSettings {
  appearance: {
    wallpaper: string;
    wallpaperMode: 'static' | 'slideshow' | 'live';
    themeMode: 'dark' | 'light' | 'auto';
    dynamicPalette: boolean;
    colorScheme: string; // 'vibrant' | 'tonalSpot' | 'expressive' etc.
    customAccent: string;
    fontFamily: string;
    uiScale: number; // 0.8 to 1.5
    cornerRadius: number; // 0 to 24px
    animations: boolean;
    animationSpeed: number; // 0.5 to 2.0
    reducedMotion: boolean;
    uiSounds: boolean;
  };
  dock: {
    iconSize: number; // 36 to 72
    autoHide: boolean;
    position: 'bottom' | 'top' | 'left' | 'right';
    magnificationPower: number; // 1.0 to 2.0
    showSeparators: boolean;
    pinnedApps: string[];
  };
  workspaces: {
    orientation: 'vertical' | 'horizontal';
    swipeGesture: boolean;
    count: number;
  };
  apps: {
    defaultBrowser: string;
    defaultTerminal: string;
    defaultEditor: string;
    associations: Record<string, string>;
  };
  terminal: {
    fontFamily: string;
    fontSize: number;
    theme: string;
    transparency: number;
    cursorStyle: 'block' | 'underline' | 'bar';
    cursorBlink: boolean;
    historySize: number;
    shell: string;
  };
  calculator: {
    mode: 'standard' | 'scientific';
    historyPersistence: boolean;
  };
  explorer: {
    viewMode: 'grid' | 'list';
    sortBy: 'name' | 'size' | 'modified';
    sortOrder: 'asc' | 'desc';
    showHidden: boolean;
    bookmarks: string[];
  };
  notepad: {
    storagePath: string;
    theme: 'system' | 'light' | 'dark';
    autoSaveIntervalMs: number;
    defaultTags: string[];
  };
  notifications: {
    timeoutMs: number;
    doNotDisturb: boolean;
    grouping: boolean;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    historyLimit: number;
  };
  sound: {
    masterVolume: number;
    masterMute: boolean;
    inputVolume: number;
    inputMute: boolean;
    appStreams: AppAudioStream[];
    equalizerPreset: string;
  };
  network: {
    wifiEnabled: boolean;
    bluetoothEnabled: boolean;
  };
  power: {
    profile: 'power-saver' | 'balanced' | 'performance';
    sleepTimeoutMin: number;
  };
  dateTime: {
    format24h: boolean;
    showSeconds: boolean;
    timezone: string;
    useNtp: boolean;
  };
  language: {
    layouts: string[];
    activeLayout: string;
    switchShortcut: string;
  };
  users: {
    currentUsername: string;
    allUsers: string[];
  };
  privacy: {
    cameraActive: boolean;
    microphoneActive: boolean;
    appPermissions: Record<string, { camera: boolean; mic: boolean; location: boolean }>;
  };
  keybindings: Record<string, string>;
  accessibility: {
    largeText: boolean;
    highContrast: boolean;
    onScreenKeyboard: boolean;
    screenReader: boolean;
  };
}

export type ClientCommand =
  // System & power
  | { type: 'system:set-volume'; volume: number }
  | { type: 'system:toggle-mute' }
  | { type: 'system:set-brightness'; brightness: number }
  | { type: 'system:toggle-night-light'; enabled: boolean }
  | { type: 'system:toggle-dnd'; enabled: boolean }
  | { type: 'system:power'; action: 'lock' | 'suspend' | 'reboot' | 'shutdown' | 'logout' }
  | { type: 'system:unlock'; pin: string }
  // Media playback
  | { type: 'media:play-pause' }
  | { type: 'media:next' }
  | { type: 'media:previous' }
  | { type: 'media:seek'; offsetSeconds: number }
  // Wayland window & workspace
  | { type: 'wayland:switch-workspace'; workspaceId: number }
  | { type: 'wayland:focus-window'; windowId: string | number }
  | { type: 'wayland:close-window'; windowId: string | number }
  | { type: 'wayland:minimize-window'; windowId: string | number }
  | { type: 'wayland:maximize-window'; windowId: string | number }
  | { type: 'wayland:snap-window'; windowId: string | number; direction: 'left' | 'right' | 'top' | 'bottom' | 'fullscreen' }
  | { type: 'wayland:move-window'; windowId: string | number; x: number; y: number }
  | { type: 'wayland:resize-window'; windowId: string | number; width: number; height: number }
  // Apps
  | { type: 'apps:launch'; exec: string; terminal?: boolean }
  // Notifications
  | { type: 'notifications:dismiss'; id: string }
  | { type: 'notifications:clear-all' }
  | { type: 'notifications:action'; id: string; actionId: string }
  // PTY
  | { type: 'pty:spawn'; sessionId: string; cols: number; rows: number; shell?: string }
  | { type: 'pty:write'; sessionId: string; data: string }
  | { type: 'pty:resize'; sessionId: string; cols: number; rows: number }
  | { type: 'pty:kill'; sessionId: string }
  // Filesystem
  | { type: 'fs:list'; path: string }
  | { type: 'fs:read'; path: string }
  | { type: 'fs:write'; path: string; content: string }
  | { type: 'fs:copy'; opId: string; source: string; destination: string }
  | { type: 'fs:move'; opId: string; source: string; destination: string }
  | { type: 'fs:delete'; path: string }
  | { type: 'fs:mkdir'; path: string }
  | { type: 'fs:rename'; oldPath: string; newPath: string }
  | { type: 'fs:extract'; opId: string; archivePath: string; destination: string }
  | { type: 'fs:compress'; opId: string; archiveType: 'zip' | 'tar.gz' | '7z'; sources: string[]; destination: string }
  // Settings
  | { type: 'settings:get' }
  | { type: 'settings:update'; patch: Partial<LunaSettings> }
  | { type: 'settings:reset' }
  | { type: 'settings:export' }
  | { type: 'settings:import'; json: string }
  // Network & BT
  | { type: 'network:scan-wifi' }
  | { type: 'network:connect-wifi'; ssid: string; password?: string }
  | { type: 'network:disconnect-wifi' }
  | { type: 'bluetooth:scan' }
  | { type: 'bluetooth:pair'; address: string }
  | { type: 'bluetooth:connect'; address: string }
  | { type: 'bluetooth:disconnect'; address: string }
  // Clipboard
  | { type: 'clipboard:copy'; content: string }
  | { type: 'clipboard:get-history' }
  // Capture
  | { type: 'capture:screenshot'; mode: 'fullscreen' | 'region' | 'window' }
  | { type: 'capture:start-record'; mode: 'fullscreen' | 'region' }
  | { type: 'capture:stop-record' };

export type ServerEvent =
  | { type: 'init'; payload: ServerInitPayload }
  | { type: 'update:battery'; payload: BatteryInfo }
  | { type: 'update:network'; payload: NetworkInfo }
  | { type: 'update:wifi-list'; payload: WifiNetwork[] }
  | { type: 'update:bluetooth-list'; payload: BluetoothDevice[] }
  | { type: 'update:audio'; payload: AudioInfo }
  | { type: 'update:audio-streams'; payload: AppAudioStream[] }
  | { type: 'update:brightness'; payload: BrightnessInfo }
  | { type: 'update:stats'; payload: SystemHardwareStats }
  | { type: 'update:media'; payload: MediaPlayerInfo }
  | { type: 'update:workspaces'; payload: WaylandWorkspace[] }
  | { type: 'update:toplevels'; payload: WaylandToplevel[] }
  | { type: 'update:active-window'; payload: WaylandToplevel | null }
  | { type: 'event:notification'; payload: NotificationItem }
  | { type: 'update:apps'; payload: AppEntry[] }
  | { type: 'pty:data'; sessionId: string; data: string }
  | { type: 'pty:exit'; sessionId: string; exitCode: number }
  | { type: 'fs:list-result'; path: string; items: FsItem[] }
  | { type: 'fs:read-result'; path: string; content: string; error?: string }
  | { type: 'fs:progress'; payload: FsProgressEvent }
  | { type: 'settings:updated'; payload: LunaSettings }
  | { type: 'clipboard:history'; payload: ClipboardItem[] }
  | { type: 'capture:completed'; filePath: string; mode: string };

export interface ServerInitPayload {
  battery: BatteryInfo;
  network: NetworkInfo;
  audio: AudioInfo;
  audioStreams: AppAudioStream[];
  brightness: BrightnessInfo;
  stats: SystemHardwareStats;
  media: MediaPlayerInfo;
  workspaces: WaylandWorkspace[];
  toplevels: WaylandToplevel[];
  activeWindow: WaylandToplevel | null;
  apps: AppEntry[];
  settings: LunaSettings;
  clipboardHistory: ClipboardItem[];
  isSimulation: boolean;
}
