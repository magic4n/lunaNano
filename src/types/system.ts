export interface BatteryInfo {
  percentage: number;
  isCharging: boolean;
  timeRemaining?: string;
  health?: number;
}

export interface NetworkInfo {
  connected: boolean;
  ssid?: string;
  ip?: string;
  type: 'wifi' | 'ethernet' | 'disconnected';
  signalStrength: number; // 0 - 100
}

export interface AudioInfo {
  volume: number; // 0 - 100
  isMuted: boolean;
  sinkName?: string;
}

export interface BrightnessInfo {
  percentage: number; // 0 - 100
}

export interface SystemHardwareStats {
  cpuUsage: number; // 0 - 100
  cpuTemp?: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  memoryPercentage: number;
  storagePercentage?: number;
  uptimeSeconds: number;
  hostname: string;
  osName: string;
}

export interface MediaPlayerInfo {
  status: 'playing' | 'paused' | 'stopped';
  title: string;
  artist: string;
  album?: string;
  artUrl?: string;
  durationSeconds: number;
  positionSeconds: number;
}

export interface WaylandWorkspace {
  id: number;
  name: string;
  active: boolean;
  urgent?: boolean;
  windowsCount: number;
}

export interface WaylandToplevel {
  id: string | number;
  title: string;
  appId: string;
  workspaceId: number;
  focused: boolean;
  fullscreen?: boolean;
  icon?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  appName: string;
  appIcon?: string;
  timestamp: number;
  urgency: 'low' | 'normal' | 'critical';
  actions?: Array<{ id: string; label: string }>;
}
