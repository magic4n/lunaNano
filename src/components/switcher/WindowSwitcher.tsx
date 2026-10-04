import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWindowStore } from '../../stores/windowStore';
import { playClickSound } from '../../theme/sounds';

export const WindowSwitcher: React.FC = () => {
  const { windows, isSwitcherOpen, switcherIndex, focusWindow, toggleSwitcher, cycleSwitcher } = useWindowStore();

  const visibleWindows = windows.filter((w) => !w.isMinimized);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        playClickSound();
        if (!isSwitcherOpen) {
          toggleSwitcher(true);
        } else {
          cycleSwitcher(e.shiftKey ? -1 : 1);
        }
      } else if (isSwitcherOpen) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          playClickSound();
          cycleSwitcher(1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          playClickSound();
          cycleSwitcher(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          playClickSound();
          if (visibleWindows[switcherIndex]) {
            focusWindow(visibleWindows[switcherIndex].id);
          }
          toggleSwitcher(false);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          toggleSwitcher(false);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey && isSwitcherOpen) {
        if (visibleWindows[switcherIndex]) {
          focusWindow(visibleWindows[switcherIndex].id);
        }
        toggleSwitcher(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSwitcherOpen, switcherIndex, visibleWindows, cycleSwitcher, focusWindow, toggleSwitcher]);

  if (!isSwitcherOpen || visibleWindows.length === 0) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="flex items-center gap-4 p-5 rounded-[28px] bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/30 shadow-[0_24px_50px_rgba(0,0,0,0.6)] overflow-x-auto max-w-4xl backdrop-blur-2xl"
        >
          {visibleWindows.map((win, idx) => {
            const isSelected = idx === switcherIndex;
            return (
              <div
                key={win.id}
                onClick={() => {
                  playClickSound();
                  focusWindow(win.id);
                  toggleSwitcher(false);
                }}
                className={`flex flex-col items-center p-4 rounded-2xl w-44 cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] scale-105 shadow-xl ring-2 ring-[var(--md-sys-color-primary)]'
                    : 'hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] opacity-85'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-[var(--md-sys-color-surface)] flex items-center justify-center mb-2.5 shadow-inner">
                  <span className="material-symbols-outlined text-[32px] text-[var(--md-sys-color-primary)]">
                    {win.icon || 'window'}
                  </span>
                </div>
                <span className="text-xs font-semibold truncate w-full text-center">
                  {win.title}
                </span>
                <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] opacity-70 mt-0.5 capitalize">
                  {win.appId}
                </span>
              </div>
            );
          })}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
