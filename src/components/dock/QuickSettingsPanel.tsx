import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIpcStore } from '../../stores/ipcStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useWindowStore } from '../../stores/windowStore';

interface QuickSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickSettingsPanel: React.FC<QuickSettingsPanelProps> = ({ isOpen, onClose }) => {
  const { audio, battery, network, stats, send } = useIpcStore();
  const { settings, updateSettings } = useSettingsStore();
  const { openApp, toggleLockScreen } = useWindowStore();

  if (!isOpen) return null;

  const isDarkMode = settings.appearance.themeMode !== 'light';

  const toggleTheme = () => {
    const next = isDarkMode ? 'light' : 'dark';
    updateSettings({ appearance: { ...settings.appearance, themeMode: next } });
    send({ type: 'settings:update', patch: { appearance: { ...settings.appearance, themeMode: next } } });
  };

  const toggleDnd = () => {
    const next = !settings.notifications.doNotDisturb;
    updateSettings({ notifications: { ...settings.notifications, doNotDisturb: next } });
    send({ type: 'settings:update', patch: { notifications: { ...settings.notifications, doNotDisturb: next } } });
  };

  const setPowerProfile = (profile: 'performance' | 'balanced' | 'power-saver') => {
    updateSettings({ power: { ...settings.power, profile } });
    send({ type: 'settings:update', patch: { power: { ...settings.power, profile } } });
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 30, x: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 30, x: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 340 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-20 right-6 w-96 rounded-[32px] bg-[var(--md-sys-color-surface-container-high)]/95 backdrop-blur-3xl text-[var(--md-sys-color-on-surface)] p-5 shadow-[0_24px_50px_rgba(0,0,0,0.55)] border border-[var(--md-sys-color-outline-variant)]/30 flex flex-col gap-4 overflow-hidden"
        >
          {/* Header with User Info & Shortcuts */}
          <div className="flex items-center justify-between pb-2 border-b border-[var(--md-sys-color-outline-variant)]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center font-bold text-sm shadow-inner">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
              <div>
                <div className="text-xs font-bold leading-tight">Luna User</div>
                <div className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">Wayland Standalone Shell</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { onClose(); toggleLockScreen(true); }}
                title="Lock Screen"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--md-sys-color-outline-variant)]/20 active:scale-95 text-[var(--md-sys-color-on-surface-variant)]"
              >
                <span className="material-symbols-outlined text-[18px]">lock</span>
              </button>
              <button
                onClick={() => { onClose(); openApp('settings'); }}
                title="All Settings"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--md-sys-color-outline-variant)]/20 active:scale-95 text-[var(--md-sys-color-on-surface-variant)]"
              >
                <span className="material-symbols-outlined text-[18px]">settings</span>
              </button>
            </div>
          </div>

          {/* M3 Quick Toggle Pills Grid (2x3) */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Wi-Fi Pill */}
            <div
              onClick={() => send({ type: network.connected ? 'network:disconnect-wifi' : 'network:scan-wifi' })}
              className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all active:scale-98 ${
                network.connected
                  ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-md'
                  : 'bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-highest)]'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">
                {network.connected ? 'wifi' : 'wifi_off'}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold leading-none truncate">
                  {network.connected ? network.ssid || 'Wi-Fi' : 'Wi-Fi'}
                </div>
                <div className="text-[10px] opacity-80 mt-0.5 truncate">
                  {network.connected ? 'Connected' : 'Disconnected'}
                </div>
              </div>
            </div>

            {/* Bluetooth Pill */}
            <div
              onClick={() => send({ type: 'bluetooth:scan' })}
              className="p-3 rounded-2xl flex items-center gap-3 cursor-pointer bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-highest)] transition-all active:scale-98"
            >
              <span className="material-symbols-outlined text-[22px] text-[var(--md-sys-color-primary)]">
                bluetooth
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold leading-none truncate">Bluetooth</div>
                <div className="text-[10px] opacity-80 mt-0.5 truncate text-[var(--md-sys-color-on-surface-variant)]">Scan</div>
              </div>
            </div>

            {/* Dark Theme Pill */}
            <div
              onClick={toggleTheme}
              className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all active:scale-98 ${
                isDarkMode
                  ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]'
                  : 'bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-highest)]'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">
                {isDarkMode ? 'dark_mode' : 'light_mode'}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold leading-none">Theme</div>
                <div className="text-[10px] opacity-80 mt-0.5 capitalize">{isDarkMode ? 'Dark' : 'Light'}</div>
              </div>
            </div>

            {/* Do Not Disturb Pill */}
            <div
              onClick={toggleDnd}
              className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all active:scale-98 ${
                settings.notifications.doNotDisturb
                  ? 'bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)]'
                  : 'bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-highest)]'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">
                {settings.notifications.doNotDisturb ? 'do_not_disturb_on' : 'notifications_active'}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold leading-none">DND</div>
                <div className="text-[10px] opacity-80 mt-0.5">
                  {settings.notifications.doNotDisturb ? 'Silent' : 'Normal'}
                </div>
              </div>
            </div>

            {/* Screenshot Pill */}
            <div
              onClick={() => {
                onClose();
                send({ type: 'capture:screenshot', mode: 'fullscreen' });
              }}
              className="p-3 rounded-2xl flex items-center gap-3 cursor-pointer bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-highest)] transition-all active:scale-98"
            >
              <span className="material-symbols-outlined text-[22px] text-[var(--md-sys-color-primary)]">
                screenshot_monitor
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold leading-none">Screenshot</div>
                <div className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5">Grim + Slurp</div>
              </div>
            </div>

            {/* Night Light Pill */}
            <div
              onClick={() => {
                const next = !settings.accessibility.highContrast;
                updateSettings({ accessibility: { ...settings.accessibility, highContrast: next } });
                send({ type: 'system:toggle-night-light', enabled: next });
              }}
              className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all active:scale-98 ${
                settings.accessibility.highContrast
                  ? 'bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)]'
                  : 'bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-highest)]'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">nightlight</span>
              <div className="min-w-0">
                <div className="text-xs font-bold leading-none">Night Light</div>
                <div className="text-[10px] opacity-80 mt-0.5">
                  {settings.accessibility.highContrast ? 'Active' : 'Off'}
                </div>
              </div>
            </div>
          </div>

          {/* Volume Slider Card (PipeWire) */}
          <div className="p-3 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--md-sys-color-on-surface-variant)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[var(--md-sys-color-primary)]">volume_up</span>
                Sound Volume
              </span>
              <span className="font-bold">{audio.volume}%</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => send({ type: 'system:toggle-mute' })}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--md-sys-color-outline-variant)]/20 text-[var(--md-sys-color-primary)]"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {audio.isMuted ? 'volume_off' : 'volume_up'}
                </span>
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={audio.volume}
                onChange={(e) => send({ type: 'system:set-volume', volume: Number(e.target.value) })}
                className="flex-1 accent-[var(--md-sys-color-primary)] cursor-pointer"
              />
            </div>
          </div>

          {/* Brightness Slider Card (brightnessctl) */}
          <div className="p-3 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--md-sys-color-on-surface-variant)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[var(--md-sys-color-primary)]">brightness_6</span>
                Screen Brightness
              </span>
              <span className="font-bold">80%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[var(--md-sys-color-primary)] pl-1">
                brightness_low
              </span>
              <input
                type="range"
                min="10"
                max="100"
                defaultValue={80}
                onChange={(e) => send({ type: 'system:set-brightness', brightness: Number(e.target.value) })}
                className="flex-1 accent-[var(--md-sys-color-primary)] cursor-pointer"
              />
            </div>
          </div>

          {/* Power Profiles Selector & Battery Meter */}
          <div className="p-3 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[var(--md-sys-color-primary)]">
                {battery.isCharging ? 'battery_charging_full' : 'battery_full'}
              </span>
              <div>
                <div className="font-bold">{battery.percentage}% {battery.isCharging ? '(Charging)' : ''}</div>
                <div className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">
                  CPU: {stats.cpuUsage.toFixed(0)}% • RAM: {stats.memoryPercentage.toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Profile chips */}
            <div className="flex gap-1">
              {(['performance', 'balanced', 'power-saver'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPowerProfile(p)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold capitalize transition-colors ${
                    settings.power.profile === p
                      ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]'
                      : 'hover:bg-[var(--md-sys-color-outline-variant)]/20 text-[var(--md-sys-color-on-surface-variant)]'
                  }`}
                >
                  {p === 'power-saver' ? 'Eco' : p.slice(0, 4)}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
