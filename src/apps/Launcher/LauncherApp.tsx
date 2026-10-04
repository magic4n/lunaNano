import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWindowStore } from '../../stores/windowStore';
import { useIpcStore } from '../../stores/ipcStore';
import { AppEntry, AppCategory } from '../../types/launcher';

export const LauncherApp: React.FC = () => {
  const { isLauncherOpen, toggleLauncher, openApp } = useWindowStore();
  const { apps, send } = useIpcStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  if (!isLauncherOpen) return null;

  const CATEGORIES = ['All', 'Favorites', 'System', 'Utilities', 'Development', 'Internet', 'Multimedia'];

  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.comment && app.comment.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategory === 'All' ? true : app.categories.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const handleLaunch = (app: AppEntry) => {
    if (['terminal', 'explorer', 'notepad', 'calculator', 'settings'].includes(app.id)) {
      openApp(app.id, app.name, app.icon);
    } else {
      send({ type: 'apps:launch', exec: app.exec, terminal: app.terminal });
      openApp(app.id, app.name, app.icon || 'public');
    }
    toggleLauncher(false);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/65 backdrop-blur-xl select-none"
        onClick={() => toggleLauncher(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] rounded-3xl p-6 shadow-2xl border border-[var(--md-sys-color-outline-variant)]/30 flex flex-col max-h-[80vh]"
        >
          {/* Search Box */}
          <div className="relative mb-4">
            <span className="material-symbols-outlined absolute left-4 top-3 text-[22px] text-[var(--md-sys-color-primary)]">
              search
            </span>
            <input
              type="text"
              autoFocus
              placeholder="Search applications, files, settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/30 text-sm text-[var(--md-sys-color-on-surface)] focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/20 transition-all"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 border-b border-[var(--md-sys-color-outline-variant)]/20">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]'
                    : 'bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Applications Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-4 sm:grid-cols-5 gap-3 p-1">
            {filteredApps.map((app) => (
              <button
                key={app.id}
                onClick={() => handleLaunch(app)}
                className="flex flex-col items-center justify-center p-4 rounded-2xl hover:bg-[var(--md-sys-color-surface-container-high)] active:scale-95 transition-all group text-center border border-transparent hover:border-[var(--md-sys-color-outline-variant)]/20"
              >
                <div className="w-14 h-14 rounded-2xl bg-[var(--md-sys-color-surface)] flex items-center justify-center mb-2 shadow-md group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[32px] text-[var(--md-sys-color-primary)]">
                    {app.icon || 'apps'}
                  </span>
                </div>
                <span className="text-xs font-semibold truncate w-full text-[var(--md-sys-color-on-surface)]">
                  {app.name}
                </span>
                {app.comment && (
                  <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] truncate w-full mt-0.5 opacity-80">
                    {app.comment}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
