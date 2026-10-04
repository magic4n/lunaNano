import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIpcStore } from '../../stores/ipcStore';
import { useSettingsStore } from '../../stores/settingsStore';

export const NotificationOverlay: React.FC = () => {
  const { notifications, dismissNotification, send } = useIpcStore();
  const { settings } = useSettingsStore();

  if (settings.notifications.doNotDisturb) return null;

  const positionClass =
    settings.notifications.position === 'top-left'
      ? 'top-4 left-4'
      : settings.notifications.position === 'bottom-right'
      ? 'bottom-24 right-4'
      : settings.notifications.position === 'bottom-left'
      ? 'bottom-24 left-4'
      : 'top-4 right-4';

  return (
    <div className={`fixed z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none ${positionClass}`}>
      <AnimatePresence>
        {notifications.slice(0, 4).map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="pointer-events-auto p-4 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] shadow-2xl border border-[var(--md-sys-color-outline-variant)]/30 backdrop-blur-xl flex flex-col gap-2 select-none"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[var(--md-sys-color-primary)]">
                  {notif.appIcon || 'notifications'}
                </span>
                <span className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider">
                  {notif.appName}
                </span>
              </div>
              <button
                onClick={() => {
                  dismissNotification(notif.id);
                  send({ type: 'notifications:dismiss', id: notif.id });
                }}
                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--md-sys-color-outline-variant)]/20 text-[var(--md-sys-color-on-surface-variant)]"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>

            <div className="text-xs font-semibold">{notif.title}</div>
            <div className="text-xs opacity-80 leading-relaxed">{notif.body}</div>

            {notif.actions && notif.actions.length > 0 && (
              <div className="flex gap-2 pt-1">
                {notif.actions.map((act: { id: string; label: string }) => (
                  <button
                    key={act.id}
                    onClick={() => {
                      send({ type: 'notifications:action', id: notif.id, actionId: act.id });
                      dismissNotification(notif.id);
                    }}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
