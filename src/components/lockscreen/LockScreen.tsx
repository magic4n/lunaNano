import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWindowStore } from '../../stores/windowStore';
import { useIpcStore } from '../../stores/ipcStore';
import { playClickSound, playNotificationSound } from '../../theme/sounds';

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

  const handleUnlock = (submittedPin?: string) => {
    const checkPin = submittedPin ?? pin;
    if (checkPin === '0000' || checkPin.length > 0) {
      playClickSound();
      send({ type: 'system:unlock', pin: checkPin });
      toggleLockScreen(false);
      setPin('');
      setError(false);
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  };

  const handleNumClick = (digit: string) => {
    playClickSound();
    const nextPin = pin + digit;
    setPin(nextPin);
    if (nextPin.length >= 4) {
      setTimeout(() => handleUnlock(nextPin), 150);
    }
  };

  const handleBackspace = () => {
    playClickSound();
    setPin((p) => p.slice(0, -1));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-between p-10 bg-black/85 backdrop-blur-3xl text-white select-none"
      >
        {/* Top: Status bar */}
        <div className="w-full flex items-center justify-between text-xs font-semibold text-white/70 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">lock</span>
            <span>LunaNano Secure Desktop</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {battery.isCharging ? 'battery_charging_full' : 'battery_full'}
            </span>
            <span>{battery.percentage}%</span>
          </div>
        </div>

        {/* Center: Clock & Keypad */}
        <div className="flex flex-col items-center gap-5">
          <div className="text-center">
            <h1 className="text-7xl font-extralight tracking-tight font-mono">{time}</h1>
            <p className="text-sm font-medium text-white/80 mt-1">{date}</p>
          </div>

          {/* User Avatar */}
          <div className="flex flex-col items-center gap-1.5 mt-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-2xl font-bold shadow-2xl border-2 border-white/20">
              <span className="material-symbols-outlined text-3xl">person</span>
            </div>
            <span className="text-xs font-bold tracking-wide">User</span>
          </div>

          {/* PIN Dots Display */}
          <div className="flex items-center gap-3 h-8">
            {[0, 1, 2, 3].map((idx) => (
              <span
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border border-white/50 transition-all duration-200 ${
                  pin.length > idx
                    ? 'bg-[var(--md-sys-color-primary)] border-[var(--md-sys-color-primary)] scale-110 shadow-[0_0_8px_var(--md-sys-color-primary)]'
                    : 'bg-transparent'
                }`}
              />
            ))}
          </div>

          {/* Tactile Keypad */}
          <div className="grid grid-cols-3 gap-3 w-64 mt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                onClick={() => handleNumClick(digit)}
                className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-xl font-semibold flex items-center justify-center transition-all mx-auto border border-white/10"
              >
                {digit}
              </button>
            ))}
            <button
              onClick={() => setPin('')}
              className="w-16 h-16 rounded-full hover:bg-white/10 active:scale-95 text-xs font-bold flex items-center justify-center text-white/70 mx-auto"
            >
              Clear
            </button>
            <button
              onClick={() => handleNumClick('0')}
              className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-xl font-semibold flex items-center justify-center transition-all mx-auto border border-white/10"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="w-16 h-16 rounded-full hover:bg-white/10 active:scale-95 text-xl flex items-center justify-center text-white/70 mx-auto"
            >
              <span className="material-symbols-outlined text-[22px]">backspace</span>
            </button>
          </div>
        </div>

        {/* Bottom footer hint */}
        <div className="text-xs text-white/40">
          Default PIN: 0000 or any 4 digits • Press Super+L to Lock
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
