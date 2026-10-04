import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useWindowStore } from '../../stores/windowStore';
import { useIpcStore } from '../../stores/ipcStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { DockContextMenu, DockContextMenuItem } from './DockContextMenu';

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

  // Magnification calculation
  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const baseSize = settings.dock.iconSize || 52;
  const maxPower = settings.dock.magnificationPower || 1.35;
  const widthSync = useTransform(distance, [-120, 0, 120], [baseSize, baseSize * maxPower, baseSize]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 350, damping: 25 });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    // Middle click = new window
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
        whileTap={{ scale: 0.92 }}
        className="relative flex items-center justify-center rounded-full bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] shadow-lg hover:shadow-2xl border border-[var(--md-sys-color-outline-variant)]/20 cursor-pointer overflow-hidden backdrop-blur-md transition-shadow"
      >
        <span className="material-symbols-outlined text-[28px] select-none pointer-events-none transition-transform group-hover:scale-110">
          {icon}
        </span>

        {/* Running dot indicator */}
        {isRunning && (
          <span
            className={`absolute bottom-1 w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              isFocused
                ? 'w-3 bg-[var(--md-sys-color-primary)] shadow-[0_0_8px_var(--md-sys-color-primary)]'
                : 'bg-[var(--md-sys-color-on-surface-variant)]/60'
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

      {/* Tooltip on hover */}
      <div className="absolute -top-9 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface)] text-[11px] font-medium px-2.5 py-1 rounded-full shadow-lg border border-[var(--md-sys-color-outline-variant)]/30 whitespace-nowrap z-40">
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
  const [showVolumePopup, setShowVolumePopup] = useState(false);

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

  return (
    <div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 select-none"
    >
      {/* Capsule 1: Launcher Capsule */}
      <motion.div
        whileTap={{ scale: 0.94 }}
        onClick={() => toggleLauncher()}
        className={`h-14 px-4 rounded-full flex items-center justify-center cursor-pointer shadow-xl backdrop-blur-xl border border-[var(--md-sys-color-outline-variant)]/25 transition-all duration-300 ${
          isLauncherOpen
            ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]'
            : 'bg-[var(--md-sys-color-surface-container)]/90 text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)]'
        }`}
      >
        <span className="material-symbols-outlined text-[26px]">grid_view</span>
      </motion.div>

      {/* Capsule 2: App Icons Capsule */}
      <div className="h-16 px-3 rounded-full bg-[var(--md-sys-color-surface-container)]/85 backdrop-blur-2xl shadow-2xl border border-[var(--md-sys-color-outline-variant)]/20 flex items-center gap-2">
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

      {/* Capsule 3: System Status & Volume Capsule */}
      <div className="relative">
        <div
          onClick={() => setShowVolumePopup(!showVolumePopup)}
          className="h-14 px-4 rounded-full bg-[var(--md-sys-color-surface-container)]/90 text-[var(--md-sys-color-on-surface)] backdrop-blur-xl shadow-xl border border-[var(--md-sys-color-outline-variant)]/25 flex items-center gap-3 cursor-pointer hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors"
        >
          {/* Audio icon */}
          <span className="material-symbols-outlined text-[20px] text-[var(--md-sys-color-on-surface-variant)]">
            {audio.isMuted ? 'volume_off' : audio.volume < 30 ? 'volume_mute' : audio.volume < 70 ? 'volume_down' : 'volume_up'}
          </span>

          {/* Network icon */}
          <span className="material-symbols-outlined text-[20px] text-[var(--md-sys-color-on-surface-variant)]">
            {network.type === 'wifi' ? (network.connected ? 'wifi' : 'wifi_off') : 'lan'}
          </span>

          {/* Battery */}
          <div className="flex items-center gap-1 text-xs font-semibold text-[var(--md-sys-color-on-surface)]">
            <span className="material-symbols-outlined text-[18px]">
              {battery.isCharging ? 'battery_charging_full' : battery.percentage > 80 ? 'battery_full' : battery.percentage > 30 ? 'battery_5_bar' : 'battery_1_bar'}
            </span>
            <span>{battery.percentage}%</span>
          </div>

          {/* Clock */}
          <div className="pl-1 border-l border-[var(--md-sys-color-outline-variant)]/30 text-xs font-bold tracking-wide">
            {currentTime}
          </div>
        </div>

        {/* Quick Volume Slider Popover */}
        {showVolumePopup && (
          <div className="absolute bottom-16 right-0 w-64 bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] p-4 rounded-3xl shadow-2xl border border-[var(--md-sys-color-outline-variant)]/30 backdrop-blur-2xl z-50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
                Master Volume
              </span>
              <span className="text-xs font-bold">{audio.volume}%</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => send({ type: 'system:toggle-mute' })}
                className="p-2 rounded-full hover:bg-[var(--md-sys-color-outline-variant)]/20 text-[var(--md-sys-color-primary)]"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {audio.isMuted ? 'volume_off' : 'volume_up'}
                </span>
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={audio.volume}
                onChange={(e) => send({ type: 'system:set-volume', volume: Number(e.target.value) })}
                className="w-full accent-[var(--md-sys-color-primary)] cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
