import { create } from 'zustand';
import { 
  ClientCommand, 
  ServerEvent, 
  ServerInitPayload, 
  BatteryInfo, 
  NetworkInfo, 
  AudioInfo, 
  BrightnessInfo, 
  SystemHardwareStats, 
  MediaPlayerInfo, 
  WaylandWorkspace, 
  NotificationItem, 
  AppEntry,
  AppAudioStream,
  WifiNetwork,
  BluetoothDevice,
  ClipboardItem,
  FsItem,
  FsProgressEvent
} from '../types/ipc';
import { useWindowStore } from './windowStore';
import { useSettingsStore, DEFAULT_SETTINGS } from './settingsStore';

interface IpcStoreState {
  connected: boolean;
  isSimulation: boolean;
  battery: BatteryInfo;
  network: NetworkInfo;
  wifiList: WifiNetwork[];
  bluetoothList: BluetoothDevice[];
  audio: AudioInfo;
  audioStreams: AppAudioStream[];
  brightness: BrightnessInfo;
  stats: SystemHardwareStats;
  media: MediaPlayerInfo;
  workspaces: WaylandWorkspace[];
  apps: AppEntry[];
  notifications: NotificationItem[];
  clipboardHistory: ClipboardItem[];
  
  // PTY handlers
  ptySubscribers: Map<string, (data: string) => void>;
  
  // FS pending promises
  fsPendingList: Map<string, (items: FsItem[]) => void>;
  fsPendingRead: Map<string, (content: string) => void>;
  fsProgressHandlers: Map<string, (event: FsProgressEvent) => void>;
  
  // Actions
  connect: () => void;
  send: (command: ClientCommand) => void;
  subscribePty: (sessionId: string, onData: (data: string) => void) => () => void;
  requestFsList: (path: string) => Promise<FsItem[]>;
  requestFsRead: (path: string) => Promise<string>;
  onFsProgress: (opId: string, handler: (event: FsProgressEvent) => void) => () => void;
  addNotification: (notification: NotificationItem) => void;
  dismissNotification: (id: string) => void;
}

const DEFAULT_APPS: AppEntry[] = [
  { id: 'terminal', name: 'Terminal', comment: 'Wayland PTY Terminal', exec: 'terminal', categories: ['System', 'Development'], icon: 'terminal' },
  { id: 'explorer', name: 'Files', comment: 'File Manager', exec: 'explorer', categories: ['System', 'Utilities'], icon: 'folder' },
  { id: 'notepad', name: 'Notes', comment: 'Markdown Editor', exec: 'notepad', categories: ['Utilities'], icon: 'edit_note' },
  { id: 'calculator', name: 'Calculator', comment: 'Material Calculator', exec: 'calculator', categories: ['Utilities'], icon: 'calculate' },
  { id: 'chromium', name: 'Chromium', comment: 'Web Browser', exec: 'chromium --enable-features=UseOzonePlatform --ozone-platform=wayland', categories: ['Internet'], icon: 'public' },
  { id: 'settings', name: 'Settings', comment: 'LunaNano Shell Settings', exec: 'settings', categories: ['System'], icon: 'settings' },
];

let socket: WebSocket | null = null;
let reconnectTimer: any = null;

export const useIpcStore = create<IpcStoreState>((set, get) => ({
  connected: false,
  isSimulation: true,
  battery: { percentage: 88, isCharging: false, timeRemaining: '4h 12m', health: 96 },
  network: { connected: true, type: 'wifi', ssid: 'LunaMesh_5G', signalStrength: 85, ip: '192.168.1.142' },
  wifiList: [
    { ssid: 'LunaMesh_5G', bssid: 'AA:BB:CC:DD:EE:01', signal: 85, security: 'WPA2/WPA3', inUse: true },
    { ssid: 'HyperWayland', bssid: 'AA:BB:CC:DD:EE:02', signal: 65, security: 'WPA2', inUse: false },
    { ssid: 'Guest_WiFi', bssid: 'AA:BB:CC:DD:EE:03', signal: 40, security: 'Open', inUse: false },
  ],
  bluetoothList: [
    { address: '11:22:33:44:55:66', name: 'Pixel Buds Pro', connected: true, paired: true, batteryPercentage: 74, icon: 'headphones' },
    { address: '77:88:99:AA:BB:CC', name: 'Keychron K3 Pro', connected: true, paired: true, icon: 'keyboard' },
  ],
  audio: { volume: 65, isMuted: false, sinkName: 'PipeWire Default Output' },
  audioStreams: [
    { id: 'stream-chromium', name: 'Chromium', appName: 'Chromium', volume: 70, isMuted: false, icon: 'public' },
    { id: 'stream-spotify', name: 'Spotify', appName: 'Spotify', volume: 55, isMuted: false, icon: 'music_note' },
  ],
  brightness: { percentage: 70 },
  stats: {
    cpuUsage: 12,
    cpuTemp: 44,
    memoryUsedMb: 3200,
    memoryTotalMb: 16384,
    memoryPercentage: 20,
    storagePercentage: 38,
    uptimeSeconds: 84200,
    hostname: 'luna-desktop',
    osName: 'Linux (LunaNano Wayland)',
  },
  media: {
    status: 'playing',
    title: 'Starfall Over Horizon',
    artist: 'Luna Ambient',
    album: 'Cosmic Drift',
    durationSeconds: 264,
    positionSeconds: 112,
  },
  workspaces: [
    { id: 1, name: '1', active: true, windowsCount: 2 },
    { id: 2, name: '2', active: false, windowsCount: 1 },
    { id: 3, name: '3', active: false, windowsCount: 0 },
    { id: 4, name: '4', active: false, windowsCount: 0 },
  ],
  apps: DEFAULT_APPS,
  notifications: [
    {
      id: 'notif-welcome',
      title: 'Welcome to LunaNano',
      body: 'Pure Wayland desktop shell powered by React & Material You 3.',
      appName: 'LunaNano',
      appIcon: 'auto_awesome',
      timestamp: Date.now() - 60000,
      urgency: 'normal',
    },
  ],
  clipboardHistory: [
    { id: 'clip-1', content: 'https://github.com/superluna/lunaNano', timestamp: Date.now() - 300000, mimeType: 'text/plain' },
    { id: 'clip-2', content: 'cargo build --release', timestamp: Date.now() - 600000, mimeType: 'text/plain' },
  ],

  ptySubscribers: new Map(),
  fsPendingList: new Map(),
  fsPendingRead: new Map(),
  fsProgressHandlers: new Map(),

  connect: () => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const url = `ws://${window.location.hostname || '127.0.0.1'}:4242`;
      socket = new WebSocket(url);

      socket.onopen = () => {
        set({ connected: true, isSimulation: false });
        // Request init and settings
        get().send({ type: 'settings:get' });
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as ServerEvent;
          const { ptySubscribers, fsPendingList, fsPendingRead, fsProgressHandlers } = get();

          switch (msg.type) {
            case 'init':
              set({
                battery: msg.payload.battery,
                network: msg.payload.network,
                audio: msg.payload.audio,
                audioStreams: msg.payload.audioStreams || [],
                brightness: msg.payload.brightness,
                stats: msg.payload.stats,
                media: msg.payload.media,
                workspaces: msg.payload.workspaces,
                apps: msg.payload.apps.length > 0 ? msg.payload.apps : DEFAULT_APPS,
                clipboardHistory: msg.payload.clipboardHistory || [],
                isSimulation: false,
              });
              if (msg.payload.settings) {
                useSettingsStore.getState().setSettings(msg.payload.settings);
              }
              useWindowStore.getState().syncNativeToplevels(msg.payload.toplevels, msg.payload.activeWindow?.id ?? null);
              break;

            case 'update:toplevels':
              useWindowStore.getState().syncNativeToplevels(msg.payload, useWindowStore.getState().activeWindowId);
              break;

            case 'update:active-window':
              if (msg.payload) {
                useWindowStore.getState().focusWindow(String(msg.payload.id));
              }
              break;

            case 'update:battery':
              set({ battery: msg.payload });
              break;

            case 'update:network':
              set({ network: msg.payload });
              break;

            case 'update:wifi-list':
              set({ wifiList: msg.payload });
              break;

            case 'update:bluetooth-list':
              set({ bluetoothList: msg.payload });
              break;

            case 'update:audio':
              set({ audio: msg.payload });
              break;

            case 'update:audio-streams':
              set({ audioStreams: msg.payload });
              break;

            case 'update:brightness':
              set({ brightness: msg.payload });
              break;

            case 'update:stats':
              set({ stats: msg.payload });
              break;

            case 'update:media':
              set({ media: msg.payload });
              break;

            case 'update:workspaces':
              set({ workspaces: msg.payload });
              break;

            case 'update:apps':
              set({ apps: msg.payload });
              break;

            case 'event:notification':
              get().addNotification(msg.payload);
              break;

            case 'pty:data':
              const subscriber = ptySubscribers.get(msg.sessionId);
              if (subscriber) {
                subscriber(msg.data);
              }
              break;

            case 'fs:list-result': {
              const resolver = fsPendingList.get(msg.path);
              if (resolver) {
                resolver(msg.items);
                fsPendingList.delete(msg.path);
              }
              break;
            }

            case 'fs:read-result': {
              const resolver = fsPendingRead.get(msg.path);
              if (resolver) {
                resolver(msg.content);
                fsPendingRead.delete(msg.path);
              }
              break;
            }

            case 'fs:progress': {
              const handler = fsProgressHandlers.get(msg.payload.opId);
              if (handler) {
                handler(msg.payload);
                if (msg.payload.status === 'completed' || msg.payload.status === 'failed') {
                  fsProgressHandlers.delete(msg.payload.opId);
                }
              }
              break;
            }

            case 'settings:updated':
              useSettingsStore.getState().setSettings(msg.payload);
              break;

            case 'clipboard:history':
              set({ clipboardHistory: msg.payload });
              break;
          }
        } catch (e) {
          console.error('Failed to parse IPC message', e);
        }
      };

      socket.onclose = () => {
        set({ connected: false, isSimulation: true });
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => get().connect(), 3000);
      };

      socket.onerror = () => {
        socket?.close();
      };
    } catch (e) {
      set({ connected: false, isSimulation: true });
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => get().connect(), 3000);
    }
  },

  send: (command: ClientCommand) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(command));
    } else {
      // Local simulation handling
      const state = get();
      if (command.type === 'system:set-volume') {
        set({ audio: { ...state.audio, volume: command.volume } });
      } else if (command.type === 'system:toggle-mute') {
        set({ audio: { ...state.audio, isMuted: !state.audio.isMuted } });
      } else if (command.type === 'system:set-brightness') {
        set({ brightness: { percentage: command.brightness } });
      } else if (command.type === 'media:play-pause') {
        const next = state.media.status === 'playing' ? 'paused' : 'playing';
        set({ media: { ...state.media, status: next } });
      } else if (command.type === 'pty:spawn') {
        // Emit initial shell prompt for simulation
        setTimeout(() => {
          const sub = state.ptySubscribers.get(command.sessionId);
          if (sub) {
            sub("\x1b[1;36mLunaNano Wayland Terminal v0.1.0\x1b[0m\r\nuser@luna:~$ ");
          }
        }, 100);
      } else if (command.type === 'pty:write') {
        // Echo and emulate simple interactive shell in simulation
        const sub = state.ptySubscribers.get(command.sessionId);
        if (sub) {
          if (command.data === '\r') {
            sub('\r\nuser@luna:~$ ');
          } else if (command.data === '\u007f') {
            // backspace
            sub('\b \b');
          } else {
            sub(command.data);
          }
        }
      } else if (command.type === 'settings:update') {
        useSettingsStore.getState().updateSettings(command.patch);
      }
    }
  },

  subscribePty: (sessionId, onData) => {
    get().ptySubscribers.set(sessionId, onData);
    return () => {
      get().ptySubscribers.delete(sessionId);
    };
  },

  requestFsList: async (path: string): Promise<FsItem[]> => {
    const { connected } = get();
    if (connected && socket?.readyState === WebSocket.OPEN) {
      return new Promise((resolve) => {
        get().fsPendingList.set(path, resolve);
        get().send({ type: 'fs:list', path });
        setTimeout(() => {
          if (get().fsPendingList.has(path)) {
            get().fsPendingList.delete(path);
            resolve([]);
          }
        }, 5000);
      });
    }

    // Realistic simulation data for File Explorer
    return [
      { name: 'Documents', path: `${path}/Documents`, isDirectory: true, size: 4096, modified: Date.now() - 3600000 },
      { name: 'Downloads', path: `${path}/Downloads`, isDirectory: true, size: 8192, modified: Date.now() - 7200000 },
      { name: 'Pictures', path: `${path}/Pictures`, isDirectory: true, size: 4096, modified: Date.now() - 86400000 },
      { name: 'Music', path: `${path}/Music`, isDirectory: true, size: 4096, modified: Date.now() - 172800000 },
      { name: 'Projects', path: `${path}/Projects`, isDirectory: true, size: 12288, modified: Date.now() - 100000 },
      { name: 'lunanano_config.json', path: `${path}/lunanano_config.json`, isDirectory: false, size: 2450, modified: Date.now() - 50000, mimeType: 'application/json' },
      { name: 'README.md', path: `${path}/README.md`, isDirectory: false, size: 4120, modified: Date.now() - 20000, mimeType: 'text/markdown' },
      { name: 'archive.7z', path: `${path}/archive.7z`, isDirectory: false, size: 1048576, modified: Date.now() - 400000, mimeType: 'application/x-7z-compressed' },
    ];
  },

  requestFsRead: async (path: string): Promise<string> => {
    const { connected } = get();
    if (connected && socket?.readyState === WebSocket.OPEN) {
      return new Promise((resolve) => {
        get().fsPendingRead.set(path, resolve);
        get().send({ type: 'fs:read', path });
        setTimeout(() => {
          if (get().fsPendingRead.has(path)) {
            get().fsPendingRead.delete(path);
            resolve('');
          }
        }, 5000);
      });
    }

    if (path.endsWith('.md')) {
      return '# LunaNano Shell\n\nPure Wayland desktop environment built with React and Material You 3.\n\n- Fast\n- Beautiful\n- Native Wayland & XWayland support\n';
    }
    return '{\n  "name": "lunanano",\n  "version": "0.1.0"\n}';
  },

  onFsProgress: (opId, handler) => {
    get().fsProgressHandlers.set(opId, handler);
    return () => {
      get().fsProgressHandlers.delete(opId);
    };
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications.slice(0, 49)],
    }));
  },

  dismissNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
}));
