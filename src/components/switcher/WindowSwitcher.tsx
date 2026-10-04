import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWindowStore } from '../../stores/windowStore';

export const WindowSwitcher: React.FC = () => {
  const { windows, isSwitcherOpen, switcherIndex, focusWindow, toggleSwitcher, cycleSwitcher } = useWindowStore();

  const visibleWindows = windows.filter((w) => !w.isMinimized);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        if (!isSwitcherOpen) {
          toggleSwitcher(true);
        } else {
          cycleSwitcher(e.shiftKey ? -1 : 1);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey && isSwitcherOpen) {
        toggleSwitcher(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSwitcherOpen, cycleSwitcher, toggleSwitcher]);

  if (!isSwitcherOpen || visibleWindows.length === 0) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="flex items-center gap-4 p-4 rounded-3xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/30 shadow-2xl overflow-x-auto max-w-4xl"
        >
          {visibleWindows.map((win, idx) => {
            const isSelected = idx === switcherIndex;
            return (
              <div
                key={win.id}
                onClick={() => {
                  focusWindow(win.id);
                  toggleSwitcher(false);
                }}
                className={`flex flex-col items-center p-4 rounded-2xl w-40 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] scale-105 shadow-xl border border-[var(--md-sys-color-primary)]'
                    : 'hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)]'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-[var(--md-sys-color-surface)] flex items-center justify-center mb-2 shadow-inner">
                  <span className="material-symbols-outlined text-3xl text-[var(--md-sys-color-primary)]">
                    {win.icon}
                  </span>
                </div>
                <span className="text-xs font-semibold truncate w-full text-center">
                  {win.title}
                </span>
              </div>
            );
          })}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
