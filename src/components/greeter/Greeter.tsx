import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useIpcStore } from '../../stores/ipcStore';

interface GreeterProps {
  onLoginSuccess?: () => void;
}

export const Greeter: React.FC<GreeterProps> = ({ onLoginSuccess }) => {
  const { settings } = useSettingsStore();
  const { send } = useIpcStore();

  const [username, setUsername] = useState('user');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState('lunanano');
  const [error, setError] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDate(now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    // Greetd authentication dispatch via IPC
    send({
      type: 'apps:launch',
      exec: `greetd-session --user ${username} --session ${session}`,
    });

    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-12 bg-black/90 backdrop-blur-3xl text-white select-none">
      {/* Top Header */}
      <div className="text-center mt-6">
        <h1 className="text-6xl font-extralight tracking-tight font-mono">{time}</h1>
        <p className="text-sm font-medium text-white/80 mt-1">{date}</p>
      </div>

      {/* Login Card */}
      <div className="w-80 p-8 rounded-3xl bg-white/5 border border-white/15 backdrop-blur-2xl shadow-2xl flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white mb-4 shadow-xl">
          <span className="material-symbols-outlined text-4xl">person</span>
        </div>

        <h3 className="text-base font-bold mb-4">LunaNano Wayland Login</h3>

        {error && (
          <div className="mb-3 text-xs text-red-400 font-semibold">{error}</div>
        )}

        <form onSubmit={handleLogin} className="w-full space-y-3">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-white/60 block mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-white/60 block mb-1">Password</label>
            <input
              type="password"
              autoFocus
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-white/60 block mb-1">Session</label>
            <select
              value={session}
              onChange={(e) => setSession(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs text-white focus:outline-none"
            >
              <option value="lunanano" className="text-black">LunaNano (Wayland)</option>
              <option value="sway" className="text-black">Sway</option>
              <option value="hyprland" className="text-black">Hyprland</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 mt-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg active:scale-95 transition-all"
          >
            Sign In
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="text-xs text-white/40">
        Greetd Greeter • LunaNano Pure Wayland Shell
      </div>
    </div>
  );
};
