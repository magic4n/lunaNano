import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWindowStore } from '../../stores/windowStore';
import { useIpcStore } from '../../stores/ipcStore';

export const LockScreen: React.FC = () => {
  const { isLockScreenOpen, toggleLockScreen } = useWindowStore();
  const { battery, send } = useIpcStore();
  const [pin, setPin] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDate(now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isLockScreenOpen) return null;

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // Default PIN: 0000 or any non-empty
    if (pin === '0000' || pin.length > 0) {
      send({ type: 'system:unlock', pin });
      toggleLockScreen(false);
      setPin('');
      setError(false);
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-between p-12 bg-black/85 backdrop-blur-3xl text-white select-none"
      >
        {/* Top: Battery info */}
        <div className="flex items-center gap-2 text-xs font-semibold text-white/70">
          <span className="material-symbols-outlined text-[18px]">
            {battery.isCharging ? 'battery_charging_full' : 'battery_full'}
          </span>
          <span>{battery.percentage}%</span>
        </div>

        {/* Center: Clock & Password box */}
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <h1 className="text-7xl font-extralight tracking-tight font-mono">{time}</h1>
            <p className="text-sm font-medium text-white/80 mt-2">{date}</p>
          </div>

          {/* User Avatar */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-3xl font-bold shadow-2xl border-2 border-white/20">
              <span className="material-symbols-outlined text-4xl">person</span>
            </div>
            <span className="text-sm font-bold tracking-wide">User</span>
          </div>

          {/* PIN Input */}
          <form onSubmit={handleUnlock} className="flex flex-col items-center gap-3">
            <input
              type="password"
              autoFocus
              placeholder="Enter PIN (default: 0000)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className={`w-64 px-4 py-2.5 rounded-full bg-white/10 border text-center text-sm text-white focus:outline-none placeholder-white/40 transition-colors ${
                error ? 'border-red-500 ring-2 ring-red-500/30' : 'border-white/20 focus:border-white/50'
              }`}
            />
            <button
              type="submit"
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center transition-all"
            >
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </button>
          </form>
        </div>

        {/* Bottom footer hint */}
        <div className="text-xs text-white/40">
          Press Enter or tap Arrow to Unlock • Super+L to Lock
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
