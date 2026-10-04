import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DockContextMenuItem {
  label: string;
  icon: string;
  action: () => void;
  destructive?: boolean;
}

interface DockContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  title: string;
  items: DockContextMenuItem[];
  onClose: () => void;
}

export const DockContextMenu: React.FC<DockContextMenuProps> = ({
  isOpen,
  x,
  y,
  title,
  items,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-50" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              position: 'fixed',
              left: Math.max(16, Math.min(window.innerWidth - 220, x - 100)),
              bottom: window.innerHeight - y + 16,
            }}
            className="z-50 min-w-[200px] bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] rounded-2xl p-1.5 shadow-2xl border border-[var(--md-sys-color-outline-variant)]/30 backdrop-blur-xl"
          >
            <div className="px-3 py-1.5 text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider border-b border-[var(--md-sys-color-outline-variant)]/20 mb-1">
              {title}
            </div>
            {items.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  item.action();
                  onClose();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                  item.destructive
                    ? 'text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-error)]/10'
                    : 'text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-primary)]/10'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
