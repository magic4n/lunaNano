import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useWindowStore } from '../../stores/windowStore';
import { useIpcStore } from '../../stores/ipcStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { DockContextMenu, DockContextMenuItem } from './DockContextMenu';
import { QuickSettingsPanel } from './QuickSettingsPanel';
import { playClickSound } from '../../theme/sounds';

interface DockItemProps {
  appId: string;
  name: string;
  icon: string;
  mouseX: any;
  isPinned: boolean;
  onReorder?: (draggedId: string, targetId: string) => void;
}

const DockCapsuleItem: React.FC<DockItemProps> = ({
  appId,
  name,
  icon,
  mouseX,
  isPinned,
  onReorder,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { windows, activeWindowId, openApp, focusWindow, minimizeWindow, closeWindow } = useWindowStore();
  const { notifications, send } = useIpcStore();
  const { settings } = useSettingsStore();

  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  // Matching windows for this app
  const appWindows = windows.filter((w) => w.appId === appId);
  const isRunning = appWindows.length > 0;
  const isFocused = appWindows.some((w) => w.id === activeWindowId && !w.isMinimized);
  const notifCount = notifications.filter((n) => n.appName.toLowerCase().includes(appId.toLowerCase())).length;

  // Gaussian-style magnification curve
  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const baseSize = settings.dock.iconSize || 54;
  const maxPower = settings.dock.magnificationPower || 1.35;
  const widthSync = useTransform(
    distance,
    [-130, -60, 0, 60, 130],
    [baseSize, baseSize * (1 + (maxPower - 1) * 0.5), baseSize * maxPower, baseSize * (1 + (maxPower - 1) * 0.5), baseSize]
  );
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 380, damping: 24 });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    if (appWindows.length === 0) {
      if (appId === 'chromium') {
        send({ type: 'apps:launch', exec: 'chromium --enable-features=UseOzonePlatform --ozone-platform=wayland' });
        openApp('chromium', 'Chromium', 'public');
      } else {
        openApp(appId);
      }
    } else {
      const active = appWindows.find((w) => w.id === activeWindowId);
      if (active && !active.isMinimized) {
        minimizeWindow(active.id);
      } else {
        const target = appWindows.find((w) => w.isMinimized) || appWindows[0];
        focusWindow(target.id);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setIsContextMenuOpen(true);
  };

  const handleAuxClick = (e: React.MouseEvent) => {
    // Middle click = new instance
    if (e.button === 1) {
      e.preventDefault();
      openApp(appId, undefined, undefined, { newInstance: true });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (appWindows.length > 1) {
      const currentIndex = appWindows.findIndex((w) => w.id === activeWindowId);
      const nextIndex = e.deltaY > 0
        ? (currentIndex + 1) % appWindows.length
        : (currentIndex - 1 + appWindows.length) % appWindows.length;
      focusWindow(appWindows[nextIndex].id);
    }
  };

  const menuItems: DockContextMenuItem[] = [
    {
      label: 'New Window',
      icon: 'add',
      action: () => openApp(appId, undefined, undefined, { newInstance: true }),
    },
    {
      label: isPinned ? 'Unpin from Dock' : 'Pin to Dock',
      icon: isPinned ? 'keep_off' : 'keep',
      action: () => {
        const currentPinned = settings.dock.pinnedApps;
        const newPinned = isPinned
          ? currentPinned.filter((id) => id !== appId)
          : [...currentPinned, appId];
        useSettingsStore.getState().updateSettings({ dock: { ...settings.dock, pinnedApps: newPinned } });
        send({ type: 'settings:update', patch: { dock: { ...settings.dock, pinnedApps: newPinned } } });
      },
    },
  ];

  if (isRunning) {
    menuItems.push({
      label: 'Close All Windows',
      icon: 'close',
      destructive: true,
      action: () => {
        appWindows.forEach((w) => closeWindow(w.id));
      },
    });
  }

  return (
    <div className="relative group">
      <motion.div
        ref={ref}
        style={{ width, height: width }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onAuxClick={handleAuxClick}
        onWheel={handleWheel}
        draggable
        onDragStart={(e: any) => e.dataTransfer?.setData('text/plain', appId)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e: any) => {
          e.preventDefault();
          const dragged = e.dataTransfer?.getData('text/plain');
          if (dragged && onReorder) onReorder(dragged, appId);
        }}
        whileTap={{ scale: 0.90 }}
        className="relative flex items-center justify-center rounded-full bg-[var(--md-sys-color-surface-container)]/95 text-[var(--md-sys-color-on-surface)] shadow-[0_8px_20px_rgba(0,0,0,0.35)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.5)] border border-[var(--md-sys-color-outline-variant)]/30 cursor-pointer overflow-hidden backdrop-blur-2xl transition-all"
      >
        <span className="material-symbols-outlined text-[28px] select-none pointer-events-none transition-transform duration-200 group-hover:scale-110 text-[var(--md-sys-color-primary)]">
          {icon}
        </span>

        {/* Running dot/pill indicator */}
        {isRunning && (
          <span
            className={`absolute bottom-1.5 rounded-full transition-all duration-300 ${
              isFocused
                ? 'w-3.5 h-1.5 bg-[var(--md-sys-color-primary)] shadow-[0_0_10px_var(--md-sys-color-primary)]'
                : 'w-1.5 h-1.5 bg-[var(--md-sys-color-on-surface-variant)]/70'
            }`}
          />
        )}

        {/* Notification badge */}
        {notifCount > 0 && (
          <div className="absolute top-1 right-1 w-4 h-4 bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
            {notifCount > 9 ? '9+' : notifCount}
          </div>
        )}
      </motion.div>

      {/* Floating Tooltip with M3 chip styling */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform group-hover:-translate-y-1 bg-[var(--md-sys-color-surface-container-highest)]/95 text-[var(--md-sys-color-on-surface)] text-[11px] font-semibold px-3 py-1 rounded-full shadow-xl border border-[var(--md-sys-color-outline-variant)]/35 whitespace-nowrap z-50 backdrop-blur-lg">
        {name}
      </div>

      <DockContextMenu
        isOpen={isContextMenuOpen}
        x={menuPos.x}
        y={menuPos.y}
        title={name}
        items={menuItems}
        onClose={() => setIsContextMenuOpen(false)}
      />
    </div>
  );
};

export const Dock: React.FC = () => {
  const mouseX = useMotionValue(Infinity);
  const { toggleLauncher, isLauncherOpen } = useWindowStore();
  const { settings } = useSettingsStore();
  const { audio, battery, network, send } = useIpcStore();

  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [isPlayingMedia, setIsPlayingMedia] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: !settings.dateTime.format24h,
        })
      );
      setCurrentDate(
        now.toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [settings.dateTime.format24h]);

  const APP_CATALOG: Record<string, { name: string; icon: string }> = {
    launcher: { name: 'Applications', icon: 'grid_view' },
    terminal: { name: 'Terminal', icon: 'terminal' },
    explorer: { name: 'Files', icon: 'folder' },
    notepad: { name: 'Notes', icon: 'edit_note' },
    calculator: { name: 'Calculator', icon: 'calculate' },
    chromium: { name: 'Chromium', icon: 'public' },
    settings: { name: 'Settings', icon: 'settings' },
  };

  const pinned = settings.dock.pinnedApps || ['launcher', 'terminal', 'explorer', 'notepad', 'calculator', 'chromium', 'settings'];

  const handleReorder = (draggedId: string, targetId: string) => {
    const next = [...pinned];
    const fromIndex = next.indexOf(draggedId);
    const toIndex = next.indexOf(targetId);
    if (fromIndex !== -1 && toIndex !== -1) {
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, draggedId);
      useSettingsStore.getState().updateSettings({ dock: { ...settings.dock, pinnedApps: next } });
      send({ type: 'settings:update', patch: { dock: { ...settings.dock, pinnedApps: next } } });
    }
  };

  const [isHovered, setIsHovered] = useState(false);
  const autoHide = settings.dock.autoHide;
  const isHidden = autoHide && !isHovered && !isLauncherOpen && !showQuickSettings;

  return (
    <>
      {/* Auto-hide mouse trigger strip */}
      {autoHide && (
        <div
          onMouseEnter={() => setIsHovered(true)}
          className="fixed bottom-0 left-0 right-0 h-3 z-30 pointer-events-auto"
        />
      )}

      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          mouseX.set(Infinity);
        }}
        onMouseMove={(e) => mouseX.set(e.pageX)}
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 select-none transition-transform duration-300 ease-out ${
          isHidden ? 'translate-y-[calc(100%+24px)] pointer-events-none' : 'translate-y-0'
        }`}
      >
        {/* Capsule 1: Launcher Capsule (100% rounded pill) */}
        <motion.div
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            playClickSound();
            toggleLauncher();
          }}
          title="App Launcher (Super)"
          className={`h-15 w-15 px-4 rounded-full flex items-center justify-center cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-2xl border border-[var(--md-sys-color-outline-variant)]/30 transition-all duration-300 ${
            isLauncherOpen
              ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-[0_0_20px_var(--md-sys-color-primary)]/50'
              : 'bg-[var(--md-sys-color-surface-container)]/90 text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container-high)]'
          }`}
        >
          <span className="material-symbols-outlined text-[26px]">grid_view</span>
        </motion.div>

        {/* Capsule 2: App Icons Capsule (100% rounded pill container) */}
        <div className="h-17 px-3.5 rounded-full bg-[var(--md-sys-color-surface-container)]/85 backdrop-blur-3xl shadow-[0_12px_32px_rgba(0,0,0,0.45)] border border-[var(--md-sys-color-outline-variant)]/25 flex items-center gap-2.5">
          {pinned.map((appId) => {
            if (appId === 'launcher') return null;
            const meta = APP_CATALOG[appId] || { name: appId, icon: 'apps' };
            return (
              <DockCapsuleItem
                key={appId}
                appId={appId}
                name={meta.name}
                icon={meta.icon}
                mouseX={mouseX}
                isPinned={true}
                onReorder={handleReorder}
              />
            );
          })}
        </div>

        {/* Capsule 3: Media Player Capsule (100% rounded pill) */}
        <div
          onClick={() => {
            playClickSound();
            setIsPlayingMedia(!isPlayingMedia);
          }}
          className="h-15 px-4 rounded-full bg-[var(--md-sys-color-surface-container)]/90 text-[var(--md-sys-color-on-surface)] backdrop-blur-2xl shadow-[0_8px_24px_rgba(0,0,0,0.35)] border border-[var(--md-sys-color-outline-variant)]/25 flex items-center gap-2.5 cursor-pointer hover:bg-[var(--md-sys-color-surface-container-high)] transition-all group"
          title="Media Controller"
        >
          {/* Animated sound wave bars */}
          <div className="flex items-end gap-0.5 h-4">
            <span className={`w-0.5 bg-[var(--md-sys-color-primary)] rounded-full transition-all duration-300 ${isPlayingMedia ? 'h-3.5 animate-pulse' : 'h-1.5'}`} />
            <span className={`w-0.5 bg-[var(--md-sys-color-primary)] rounded-full transition-all duration-300 ${isPlayingMedia ? 'h-4 animate-bounce' : 'h-2.5'}`} />
            <span className={`w-0.5 bg-[var(--md-sys-color-primary)] rounded-full transition-all duration-300 ${isPlayingMedia ? 'h-2 animate-pulse' : 'h-1'}`} />
          </div>

          <div className="flex flex-col justify-center min-w-0 max-w-[90px]">
            <span className="text-[11px] font-bold leading-tight truncate">
              {isPlayingMedia ? 'Playing' : 'Media'}
            </span>
            <span className="text-[9px] text-[var(--md-sys-color-on-surface-variant)] truncate">
              {isPlayingMedia ? 'PipeWire Stream' : 'Idle'}
            </span>
          </div>

          <span className="material-symbols-outlined text-[18px] text-[var(--md-sys-color-primary)] group-hover:scale-110 transition-transform">
            {isPlayingMedia ? 'pause_circle' : 'play_circle'}
          </span>
        </div>

        {/* Capsule 4: Quick Settings & System Status Capsule (100% rounded pill) */}
        <div
          onClick={() => {
            playClickSound();
            setShowQuickSettings(!showQuickSettings);
          }}
          className={`h-15 px-4 rounded-full backdrop-blur-2xl shadow-[0_8px_24px_rgba(0,0,0,0.35)] border transition-all flex items-center gap-3 cursor-pointer ${
            showQuickSettings
              ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)] shadow-[0_0_20px_var(--md-sys-color-primary)]/40'
              : 'bg-[var(--md-sys-color-surface-container)]/90 text-[var(--md-sys-color-on-surface)] border-[var(--md-sys-color-outline-variant)]/25 hover:bg-[var(--md-sys-color-surface-container-high)]'
          }`}
          title="Quick Settings & System Status"
        >
          {/* Audio */}
          <span className="material-symbols-outlined text-[19px] text-[var(--md-sys-color-primary)]">
            {audio.isMuted ? 'volume_off' : audio.volume < 30 ? 'volume_mute' : audio.volume < 70 ? 'volume_down' : 'volume_up'}
          </span>

          {/* Network */}
          <span className="material-symbols-outlined text-[19px] text-[var(--md-sys-color-primary)]">
            {network.type === 'wifi' ? (network.connected ? 'wifi' : 'wifi_off') : 'lan'}
          </span>

          {/* Battery */}
          <div className="flex items-center gap-1 text-xs font-bold">
            <span className="material-symbols-outlined text-[18px] text-[var(--md-sys-color-primary)]">
              {battery.isCharging ? 'battery_charging_full' : battery.percentage > 80 ? 'battery_full' : battery.percentage > 30 ? 'battery_5_bar' : 'battery_1_bar'}
            </span>
            <span>{battery.percentage}%</span>
          </div>

          {/* Clock & Date */}
          <div className="pl-1.5 border-l border-[var(--md-sys-color-outline-variant)]/30 flex flex-col justify-center">
            <span className="text-xs font-bold tracking-tight leading-none">{currentTime}</span>
            <span className="text-[9px] text-[var(--md-sys-color-on-surface-variant)] leading-tight mt-0.5">{currentDate}</span>
          </div>
        </div>
      </div>

      {/* Quick Settings Panel Overlay */}
      <QuickSettingsPanel
        isOpen={showQuickSettings}
        onClose={() => setShowQuickSettings(false)}
      />
    </>
  );
};
