import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWindowStore } from '../../stores/windowStore';
import { useIpcStore } from '../../stores/ipcStore';

export const ScreenshotOverlay: React.FC = () => {
  const { isScreenshotOverlayOpen, closeScreenshotOverlay, screenshotMode } = useWindowStore();
  const { send } = useIpcStore();

  const [mode, setMode] = useState<'fullscreen' | 'region' | 'window'>(screenshotMode);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  useEffect(() => {
    let timer: any = null;
    if (isRecording) {
      timer = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } else {
      setRecordSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  if (!isScreenshotOverlayOpen) return null;

  const handleCapture = () => {
    send({ type: 'capture:screenshot', mode });
    closeScreenshotOverlay();
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      send({ type: 'capture:stop-record' });
      setIsRecording(false);
      closeScreenshotOverlay();
    } else {
      send({ type: 'capture:start-record', mode: mode === 'window' ? 'fullscreen' : mode });
      setIsRecording(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center pb-24 bg-black/40 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          className="p-3 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline-variant)]/30 shadow-2xl flex items-center gap-3 backdrop-blur-xl"
        >
          {/* Mode Selector */}
          <div className="flex items-center gap-1 bg-[var(--md-sys-color-surface)] p-1 rounded-full border border-[var(--md-sys-color-outline-variant)]/20">
            <button
              onClick={() => setMode('fullscreen')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                mode === 'fullscreen'
                  ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]'
                  : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">fullscreen</span>
              <span>Screen</span>
            </button>
            <button
              onClick={() => setMode('region')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                mode === 'region'
                  ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]'
                  : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">crop</span>
              <span>Region</span>
            </button>
            <button
              onClick={() => setMode('window')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                mode === 'window'
                  ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]'
                  : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">window</span>
              <span>Window</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pr-1">
            <button
              onClick={handleCapture}
              className="px-4 py-2 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              <span>Screenshot</span>
            </button>

            <button
              onClick={handleToggleRecord}
              className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 ${
                isRecording
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">videocam</span>
              <span>{isRecording ? `Recording (${formatTime(recordSeconds)})` : 'Record'}</span>
            </button>

            <button
              onClick={closeScreenshotOverlay}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--md-sys-color-outline-variant)]/20"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
