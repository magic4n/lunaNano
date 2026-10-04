import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../../stores/settingsStore';

export const OnScreenKeyboard: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const [isShift, setIsShift] = useState(false);

  if (!settings.accessibility.onScreenKeyboard) return null;

  const ROWS = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
    ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['Caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
    ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
    ['Space', 'Hide'],
  ];

  const handleKeyPress = (key: string) => {
    if (key === 'Hide') {
      updateSettings({ accessibility: { ...settings.accessibility, onScreenKeyboard: false } });
      return;
    }
    if (key === 'Shift' || key === 'Caps') {
      setIsShift(!isShift);
      return;
    }

    let charToSend = key;
    if (key === 'Space') charToSend = ' ';
    else if (key === 'Enter') charToSend = '\n';
    else if (key === 'Tab') charToSend = '\t';
    else if (isShift && charToSend.length === 1) charToSend = charToSend.toUpperCase();

    // Dispatch key event to active element
    const active = document.activeElement;
    if (active && (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) {
      if (key === 'Backspace') {
        const start = active.selectionStart || 0;
        const end = active.selectionEnd || 0;
        if (start === end && start > 0) {
          active.value = active.value.slice(0, start - 1) + active.value.slice(start);
          active.selectionStart = active.selectionEnd = start - 1;
        } else {
          active.value = active.value.slice(0, start) + active.value.slice(end);
          active.selectionStart = active.selectionEnd = start;
        }
      } else {
        const start = active.selectionStart || 0;
        active.value = active.value.slice(0, start) + charToSend + active.value.slice(start);
        active.selectionStart = active.selectionEnd = start + charToSend.length;
      }
      active.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 200, opacity: 0 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] p-3 rounded-3xl shadow-2xl border border-[var(--md-sys-color-outline-variant)]/30 backdrop-blur-2xl select-none"
      >
        <div className="flex flex-col gap-1.5 w-[650px]">
          {ROWS.map((row, rIdx) => (
            <div key={rIdx} className="flex justify-center gap-1.5">
              {row.map((k) => {
                const displayKey = isShift && k.length === 1 ? k.toUpperCase() : k;
                const isSpecial = ['Backspace', 'Enter', 'Shift', 'Tab', 'Caps', 'Space', 'Hide'].includes(k);
                let widthClass = 'w-10';
                if (k === 'Space') widthClass = 'w-64';
                else if (k === 'Backspace' || k === 'Enter') widthClass = 'w-20';
                else if (k === 'Shift') widthClass = 'w-16';
                else if (k === 'Tab' || k === 'Caps') widthClass = 'w-14';

                return (
                  <button
                    key={k}
                    onClick={() => handleKeyPress(k)}
                    className={`h-10 ${widthClass} rounded-xl text-xs font-semibold flex items-center justify-center transition-all active:scale-95 ${
                      isSpecial
                        ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]'
                        : 'bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container)]'
                    }`}
                  >
                    {displayKey}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
