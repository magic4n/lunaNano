import React, { useState } from 'react';
import { useSettingsStore, DEFAULT_SETTINGS } from '../../stores/settingsStore';
import { useIpcStore } from '../../stores/ipcStore';
import { generateM3ThemeFromHex, applyThemeTokens } from '../../theme/materialColor';
import { WALLPAPER_PRESETS, WallpaperPreset } from '../../theme/wallpapers';

type SettingsSectionId =
  | 'appearance'
  | 'dock'
  | 'workspaces'
  | 'apps'
  | 'terminal'
  | 'calculator'
  | 'explorer'
  | 'notepad'
  | 'notifications'
  | 'sound'
  | 'network'
  | 'power'
  | 'dateTime'
  | 'language'
  | 'users'
  | 'privacy'
  | 'updates'
  | 'keybindings'
  | 'accessibility'
  | 'about'
  | 'backup';

export const SettingsApp: React.FC = () => {
  const { settings, updateSettings, resetToDefaults } = useSettingsStore();
  const { 
    send, 
    wifiList, 
    bluetoothList, 
    audio, 
    audioStreams, 
    battery, 
    stats,
    notifications 
  } = useIpcStore();

  const [activeSection, setActiveSection] = useState<SettingsSectionId>('appearance');
  const [saveBanner, setSaveBanner] = useState(false);

  const saveSettings = (patch: any) => {
    updateSettings(patch);
    send({ type: 'settings:update', patch });
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 2000);
  };

  const handleAccentChange = (hex: string) => {
    saveSettings({ appearance: { ...settings.appearance, customAccent: hex, dynamicPalette: false } });
    const theme = generateM3ThemeFromHex(hex);
    applyThemeTokens(settings.appearance.themeMode === 'light' ? theme.light : theme.dark, settings.appearance.themeMode !== 'light');
    send({ type: 'settings:update', patch: { appearance: { ...settings.appearance, customAccent: hex } } });
  };

  const handleWallpaperSelect = (preset: WallpaperPreset) => {
    saveSettings({
      appearance: {
        ...settings.appearance,
        wallpaper: preset.style,
        customAccent: preset.accentSeed,
        dynamicPalette: true,
      },
    });
    const theme = generateM3ThemeFromHex(preset.accentSeed);
    applyThemeTokens(
      settings.appearance.themeMode === 'light' ? theme.light : theme.dark,
      settings.appearance.themeMode !== 'light'
    );
    send({
      type: 'settings:update',
      patch: {
        appearance: {
          ...settings.appearance,
          wallpaper: preset.style,
          customAccent: preset.accentSeed,
        },
      },
    });
  };

  const handleExportProfile = () => {
    const json = JSON.stringify(settings, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lunanano_settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportProfile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string);
        updateSettings(imported);
        send({ type: 'settings:import', json: ev.target?.result as string });
        alert('Settings profile imported successfully.');
      } catch (err) {
        alert('Failed to parse settings JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const SECTIONS = [
    { id: 'appearance', label: 'Appearance', icon: 'palette' },
    { id: 'dock', label: 'Dock', icon: 'dock_to_bottom' },
    { id: 'workspaces', label: 'Workspaces', icon: 'splitscreen' },
    { id: 'apps', label: 'Default Apps', icon: 'apps' },
    { id: 'terminal', label: 'Terminal', icon: 'terminal' },
    { id: 'calculator', label: 'Calculator', icon: 'calculate' },
    { id: 'explorer', label: 'File Explorer', icon: 'folder' },
    { id: 'notepad', label: 'Notepad', icon: 'edit_note' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
    { id: 'sound', label: 'Sound & Mixer', icon: 'volume_up' },
    { id: 'network', label: 'Wi-Fi & Bluetooth', icon: 'wifi' },
    { id: 'power', label: 'Power & Battery', icon: 'battery_charging_full' },
    { id: 'dateTime', label: 'Date & Time', icon: 'schedule' },
    { id: 'language', label: 'Keyboard & Layouts', icon: 'language' },
    { id: 'users', label: 'Users', icon: 'group' },
    { id: 'privacy', label: 'Privacy & Permissions', icon: 'security' },
    { id: 'updates', label: 'Updates', icon: 'system_update' },
    { id: 'keybindings', label: 'Shortcuts', icon: 'keyboard' },
    { id: 'accessibility', label: 'Accessibility', icon: 'accessibility' },
    { id: 'about', label: 'About System', icon: 'info' },
    { id: 'backup', label: 'Backup & Reset', icon: 'settings_backup_restore' },
  ];

  return (
    <div className="w-full h-full flex bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] select-none">
      {/* Settings Navigation Sidebar */}
      <div className="w-56 border-r border-[var(--md-sys-color-outline-variant)]/20 bg-[var(--md-sys-color-surface-container)] flex flex-col p-2">
        <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] mb-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">tune</span>
          <span>Preferences</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-0.5">
          {SECTIONS.map((sec) => {
            const isSelected = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as SettingsSectionId)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-semibold shadow-sm'
                    : 'text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)] hover:text-[var(--md-sys-color-on-surface)]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{sec.icon}</span>
                <span className="truncate">{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings Content Area */}
      <div className="flex-1 p-6 overflow-y-auto relative">
        {saveBanner && (
          <div className="sticky top-0 mb-4 px-4 py-2 rounded-2xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] text-xs font-semibold shadow-lg flex items-center gap-2 z-20">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>Settings saved and synchronized (~/.config/lunanano/settings.json)</span>
          </div>
        )}

        {/* 1. Appearance */}
        {activeSection === 'appearance' && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-lg font-bold">Appearance & Theme</h2>

            {/* Dynamic Wallpaper Gallery */}
            <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
                  Wallpapers & Material You Dynamic Themes
                </label>
                <span className="text-[10px] text-[var(--md-sys-color-primary)] font-semibold">Live MCU Extraction</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {WALLPAPER_PRESETS.map((wp) => {
                  const isSelected = settings.appearance.wallpaper === wp.style;
                  return (
                    <div
                      key={wp.id}
                      onClick={() => handleWallpaperSelect(wp)}
                      className={`h-24 rounded-2xl cursor-pointer p-2 flex flex-col justify-between transition-all duration-200 border-2 relative overflow-hidden group shadow-md ${
                        isSelected
                          ? 'border-[var(--md-sys-color-primary)] ring-2 ring-[var(--md-sys-color-primary)]/40 scale-[1.02]'
                          : 'border-transparent hover:border-[var(--md-sys-color-outline-variant)]/50'
                      }`}
                      style={{ background: wp.style }}
                    >
                      <div className="flex justify-between items-center z-10">
                        <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: wp.accentSeed }} />
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center text-[12px] font-bold shadow-md">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="z-10 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-semibold text-white truncate">
                        {wp.name}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Wallpaper URL */}
              <div className="pt-2">
                <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">Custom Wallpaper (URL or CSS Gradient)</label>
                <input
                  type="text"
                  placeholder="https://... or linear-gradient(...)"
                  value={settings.appearance.wallpaper}
                  onChange={(e) => saveSettings({ appearance: { ...settings.appearance, wallpaper: e.target.value } })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/30 text-xs text-[var(--md-sys-color-on-surface)]"
                />
              </div>
            </div>

            {/* Theme Mode */}
            <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">Theme Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {(['dark', 'light', 'auto'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => saveSettings({ appearance: { ...settings.appearance, themeMode: m } })}
                    className={`py-2 rounded-xl text-xs font-semibold capitalize border ${settings.appearance.themeMode === m ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface)] border-[var(--md-sys-color-outline-variant)]/30'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color & Palette */}
            <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">Material You 3 Accent Seed Color</label>
              <div className="flex items-center gap-3">
                {['#6750A4', '#006A60', '#A03A40', '#00639B', '#4C662B', '#7A5300', '#E91E63', '#3F51B5'].map((color) => (
                  <button
                    key={color}
                    onClick={() => handleAccentChange(color)}
                    style={{ backgroundColor: color }}
                    className={`w-9 h-9 rounded-full shadow-md transition-transform ${settings.appearance.customAccent === color ? 'scale-110 ring-2 ring-[var(--md-sys-color-primary)]' : 'hover:scale-105'}`}
                  />
                ))}
                <input
                  type="color"
                  value={settings.appearance.customAccent}
                  onChange={(e) => handleAccentChange(e.target.value)}
                  className="w-9 h-9 rounded-full cursor-pointer bg-transparent border-none"
                />
              </div>
            </div>

            {/* Screen Corner Radius */}
            <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 space-y-3">
              <div className="flex justify-between text-xs font-semibold">
                <span>Screen Corner Radius</span>
                <span>{settings.appearance.cornerRadius}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                value={settings.appearance.cornerRadius}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  document.documentElement.style.setProperty('--luna-screen-radius', `${val}px`);
                  saveSettings({ appearance: { ...settings.appearance, cornerRadius: val } });
                }}
                className="w-full accent-[var(--md-sys-color-primary)]"
              />
            </div>

            {/* UI Scale & Animations */}
            <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Display UI Scale</span>
                  <span>{settings.appearance.uiScale || 1.0}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.5"
                  step="0.05"
                  value={settings.appearance.uiScale || 1.0}
                  onChange={(e) => saveSettings({ appearance: { ...settings.appearance, uiScale: Number(e.target.value) } })}
                  className="w-full accent-[var(--md-sys-color-primary)]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold">Smooth Animations</div>
                  <div className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">Framer Motion spring physics and morphing</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.appearance.animations}
                  onChange={(e) => saveSettings({ appearance: { ...settings.appearance, animations: e.target.checked } })}
                  className="w-5 h-5 accent-[var(--md-sys-color-primary)]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold">Reduced Motion</div>
                  <div className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">Minimize window opening and dock scaling effects</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.appearance.reducedMotion}
                  onChange={(e) => saveSettings({ appearance: { ...settings.appearance, reducedMotion: e.target.checked } })}
                  className="w-5 h-5 accent-[var(--md-sys-color-primary)]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold">UI Sound Effects</div>
                  <div className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">Haptic audio feedback on window and dock actions</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.appearance.uiSounds}
                  onChange={(e) => saveSettings({ appearance: { ...settings.appearance, uiSounds: e.target.checked } })}
                  className="w-5 h-5 accent-[var(--md-sys-color-primary)]"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. Dock */}
        {activeSection === 'dock' && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-lg font-bold">Dock Preferences</h2>

            <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Icon Size</span>
                  <span>{settings.dock.iconSize}px</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="64"
                  value={settings.dock.iconSize}
                  onChange={(e) => saveSettings({ dock: { ...settings.dock, iconSize: Number(e.target.value) } })}
                  className="w-full accent-[var(--md-sys-color-primary)]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Magnification Power</span>
                  <span>{settings.dock.magnificationPower}x</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="1.8"
                  step="0.05"
                  value={settings.dock.magnificationPower}
                  onChange={(e) => saveSettings({ dock: { ...settings.dock, magnificationPower: Number(e.target.value) } })}
                  className="w-full accent-[var(--md-sys-color-primary)]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-xs font-semibold">Show Separators</div>
                  <div className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">Pill capsule separations</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.dock.showSeparators}
                  onChange={(e) => saveSettings({ dock: { ...settings.dock, showSeparators: e.target.checked } })}
                  className="w-5 h-5 accent-[var(--md-sys-color-primary)]"
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. Workspaces */}
        {activeSection === 'workspaces' && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-lg font-bold">Workspaces</h2>
            <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">Workspace Orientation</label>
              <div className="grid grid-cols-2 gap-2">
                {(['vertical', 'horizontal'] as const).map((o) => (
                  <button
                    key={o}
                    onClick={() => saveSettings({ workspaces: { ...settings.workspaces, orientation: o } })}
                    className={`py-2 rounded-xl text-xs font-semibold capitalize border ${settings.workspaces.orientation === o ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface)] border-[var(--md-sys-color-outline-variant)]/30'}`}
                  >
                    {o}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <div className="text-xs font-semibold">Touchpad Swipe Gestures</div>
                  <div className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">3-finger swipe to switch workspaces</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.workspaces.swipeGesture}
                  onChange={(e) => saveSettings({ workspaces: { ...settings.workspaces, swipeGesture: e.target.checked } })}
                  className="w-5 h-5 accent-[var(--md-sys-color-primary)]"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. Default Apps */}
        {activeSection === 'apps' && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-lg font-bold">Default Applications</h2>
            <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">Web Browser</label>
                <input
                  type="text"
                  value={settings.apps.defaultBrowser}
                  onChange={(e) => saveSettings({ apps: { ...settings.apps, defaultBrowser: e.target.value } })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/30 text-xs text-[var(--md-sys-color-on-surface)]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">Terminal Emulator</label>
                <input
                  type="text"
                  value={settings.apps.defaultTerminal}
                  onChange={(e) => saveSettings({ apps: { ...settings.apps, defaultTerminal: e.target.value } })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/30 text-xs text-[var(--md-sys-color-on-surface)]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">Text / Markdown Editor</label>
                <input
                  type="text"
                  value={settings.apps.defaultEditor}
                  onChange={(e) => saveSettings({ apps: { ...settings.apps, defaultEditor: e.target.value } })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/30 text-xs text-[var(--md-sys-color-on-surface)]"
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. Terminal */}
        {activeSection === 'terminal' && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-lg font-bold">Terminal Preferences</h2>
            <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold">Font Family</label>
                  <input
                    type="text"
                    value={settings.terminal.fontFamily}
                    onChange={(e) => saveSettings({ terminal: { ...settings.terminal, fontFamily: e.target.value } })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/30 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">Font Size</label>
                  <input
                    type="number"
                    value={settings.terminal.fontSize}
                    onChange={(e) => saveSettings({ terminal: { ...settings.terminal, fontSize: Number(e.target.value) } })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/30 text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold">
                  <span>Window Transparency</span>
                  <span>{Math.round(settings.terminal.transparency * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={settings.terminal.transparency}
                  onChange={(e) => saveSettings({ terminal: { ...settings.terminal, transparency: Number(e.target.value) } })}
                  className="w-full mt-1 accent-[var(--md-sys-color-primary)]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Shell Executable</label>
                <input
                  type="text"
                  value={settings.terminal.shell}
                  onChange={(e) => saveSettings({ terminal: { ...settings.terminal, shell: e.target.value } })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/30 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* 6. Sound & WirePlumber */}
        {activeSection === 'sound' && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-lg font-bold">Sound & PipeWire Mixer</h2>
            <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold">
                  <span>Master Output Volume</span>
                  <span>{audio.volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={audio.volume}
                  onChange={(e) => send({ type: 'system:set-volume', volume: Number(e.target.value) })}
                  className="w-full mt-1 accent-[var(--md-sys-color-primary)]"
                />
              </div>

              <div className="pt-2 border-t border-[var(--md-sys-color-outline-variant)]/20">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] mb-2 block">
                  Per-App Volume Streams (WirePlumber)
                </label>
                <div className="space-y-3">
                  {audioStreams.map((stream) => (
                    <div key={stream.id} className="p-3 rounded-xl bg-[var(--md-sys-color-surface)] flex items-center gap-3">
                      <span className="material-symbols-outlined text-[20px] text-[var(--md-sys-color-primary)]">
                        {stream.icon || 'volume_up'}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span>{stream.name}</span>
                          <span>{stream.volume}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={stream.volume}
                          onChange={(e) => {
                            const nextVol = Number(e.target.value);
                            const updated = audioStreams.map((s) => (s.id === stream.id ? { ...s, volume: nextVol } : s));
                            saveSettings({ sound: { ...settings.sound, appStreams: updated } });
                          }}
                          className="w-full accent-[var(--md-sys-color-primary)]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. Network & Bluetooth */}
        {activeSection === 'network' && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-lg font-bold">Network & Bluetooth</h2>
            <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">Available Wi-Fi Networks (nmcli)</span>
                <button
                  onClick={() => send({ type: 'network:scan-wifi' })}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]"
                >
                  Scan
                </button>
              </div>
              <div className="space-y-1">
                {wifiList.map((wf) => (
                  <div key={wf.bssid} className="p-2.5 rounded-xl bg-[var(--md-sys-color-surface)] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[var(--md-sys-color-primary)]">wifi</span>
                      <span className="font-semibold">{wf.ssid}</span>
                      {wf.inUse && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Connected</span>}
                    </div>
                    <span className="text-[11px] opacity-75">{wf.signal}%</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[var(--md-sys-color-outline-variant)]/20">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] block mb-2">Paired Bluetooth Devices (bluetoothctl)</span>
                <div className="space-y-1">
                  {bluetoothList.map((bt) => (
                    <div key={bt.address} className="p-2.5 rounded-xl bg-[var(--md-sys-color-surface)] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-[var(--md-sys-color-primary)]">{bt.icon || 'bluetooth'}</span>
                        <span className="font-semibold">{bt.name}</span>
                      </div>
                      <span className="text-[11px] opacity-75">{bt.connected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 8. Power & Battery */}
        {activeSection === 'power' && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-lg font-bold">Power Profiles & Battery</h2>
            <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 space-y-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-[var(--md-sys-color-primary)]">battery_charging_full</span>
                <div>
                  <div className="text-xl font-bold">{battery.percentage}%</div>
                  <div className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                    {battery.isCharging ? 'Charging' : 'Discharging'} • {battery.timeRemaining || 'Calculated'} • Health: {battery.health}%
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] block mb-2">
                  power-profiles-daemon Profile
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['power-saver', 'balanced', 'performance'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => saveSettings({ power: { ...settings.power, profile: p } })}
                      className={`py-2 rounded-xl text-xs font-semibold capitalize border ${settings.power.profile === p ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-[var(--md-sys-color-surface)] border-[var(--md-sys-color-outline-variant)]/30'}`}
                    >
                      {p.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 9. Keybindings */}
        {activeSection === 'keybindings' && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-lg font-bold">Global Shortcuts</h2>
            <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 space-y-2">
              {Object.entries(settings.keybindings).map(([key, action]) => (
                <div key={key} className="flex items-center justify-between p-2 rounded-xl bg-[var(--md-sys-color-surface)] text-xs">
                  <span className="font-mono bg-[var(--md-sys-color-surface-container-high)] px-2 py-1 rounded text-[var(--md-sys-color-primary)] font-bold">
                    {key}
                  </span>
                  <span className="capitalize font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                    {action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 10. About System */}
        {activeSection === 'about' && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-lg font-bold">About LunaNano</h2>
            <div className="p-6 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-[var(--md-sys-color-outline-variant)]/20">
                <span className="material-symbols-outlined text-4xl text-[var(--md-sys-color-primary)]">auto_awesome</span>
                <div>
                  <h3 className="font-bold text-base">LunaNano Wayland Shell</h3>
                  <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">Version 0.1.0 • React + Tauri + Smithay / wlroots</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[var(--md-sys-color-on-surface-variant)]">Operating System:</span>
                  <p className="font-semibold">{stats.osName}</p>
                </div>
                <div>
                  <span className="text-[var(--md-sys-color-on-surface-variant)]">Host:</span>
                  <p className="font-semibold">{stats.hostname}</p>
                </div>
                <div>
                  <span className="text-[var(--md-sys-color-on-surface-variant)]">CPU Load:</span>
                  <p className="font-semibold">{stats.cpuUsage}% • {stats.cpuTemp ? `${stats.cpuTemp}°C` : 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[var(--md-sys-color-on-surface-variant)]">RAM Usage:</span>
                  <p className="font-semibold">{Math.round(stats.memoryUsedMb / 1024)}GB / {Math.round(stats.memoryTotalMb / 1024)}GB ({stats.memoryPercentage}%)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 11. Backup & Reset */}
        {activeSection === 'backup' && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-lg font-bold">Backup & Factory Reset</h2>
            <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/20 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Export Settings Profile</div>
                  <div className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">Download ~/.config/lunanano/settings.json backup</div>
                </div>
                <button
                  onClick={handleExportProfile}
                  className="px-4 py-2 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-semibold shadow-md"
                >
                  Export JSON
                </button>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--md-sys-color-outline-variant)]/20">
                <div>
                  <div className="font-semibold">Import Settings Profile</div>
                  <div className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">Restore configuration from JSON file</div>
                </div>
                <label className="px-4 py-2 rounded-full bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] font-semibold cursor-pointer">
                  Import JSON
                  <input type="file" accept=".json" onChange={handleImportProfile} className="hidden" />
                </label>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--md-sys-color-outline-variant)]/20">
                <div>
                  <div className="font-semibold text-[var(--md-sys-color-error)]">Factory Reset</div>
                  <div className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">Reset all configurations back to initial defaults</div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Reset all settings to default?')) {
                      resetToDefaults();
                      send({ type: 'settings:reset' });
                    }
                  }}
                  className="px-4 py-2 rounded-full bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] font-semibold shadow-md"
                >
                  Reset All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
