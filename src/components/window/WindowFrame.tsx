import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWindowStore, AppWindow } from '../../stores/windowStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { playClickSound, playMinimizeSound, playSnapSound } from '../../theme/sounds';

interface WindowFrameProps {
  window: AppWindow;
  children: React.ReactNode;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({ window: win, children }) => {
  const {
    focusWindow,
    minimizeWindow,
    toggleMaximizeWindow,
    closeWindow,
    updateWindowPosition,
    updateWindowSize,
    snapWindow,
  } = useWindowStore();
  const { settings } = useSettingsStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [initialResize, setInitialResize] = useState({ x: 0, y: 0, width: 0, height: 0, startMouseX: 0, startMouseY: 0 });
  const [snapPreview, setSnapPreview] = useState<'left' | 'right' | 'fullscreen' | null>(null);

  const screenRadius = settings.appearance.cornerRadius || 16;
  const isReducedMotion = settings.appearance.reducedMotion;

  // Window Dragging
  const handleMouseDownHeader = (e: React.MouseEvent) => {
    if (win.isMaximized) return;
    if ((e.target as HTMLElement).closest('.window-control-btn')) return;
    focusWindow(win.id);
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - win.x,
      y: e.clientY - win.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        let newX = e.clientX - dragOffset.x;
        let newY = Math.max(0, e.clientY - dragOffset.y);

        // Snap preview trigger zones
        if (e.clientX < 40) {
          setSnapPreview('left');
        } else if (e.clientX > window.innerWidth - 40) {
          setSnapPreview('right');
        } else if (e.clientY < 30) {
          setSnapPreview('fullscreen');
        } else {
          setSnapPreview(null);
        }

        updateWindowPosition(win.id, newX, newY);
      } else if (isResizing && resizeDirection) {
        const deltaX = e.clientX - initialResize.startMouseX;
        const deltaY = e.clientY - initialResize.startMouseY;

        let newW = initialResize.width;
        let newH = initialResize.height;
        let newX = initialResize.x;
        let newY = initialResize.y;

        if (resizeDirection.includes('right')) newW = Math.max(340, initialResize.width + deltaX);
        if (resizeDirection.includes('bottom')) newH = Math.max(220, initialResize.height + deltaY);
        if (resizeDirection.includes('left')) {
          const clamped = Math.max(340, initialResize.width - deltaX);
          newX = initialResize.x + (initialResize.width - clamped);
          newW = clamped;
        }
        if (resizeDirection.includes('top')) {
          const clamped = Math.max(220, initialResize.height - deltaY);
          newY = initialResize.y + (initialResize.height - clamped);
          newH = clamped;
        }

        updateWindowPosition(win.id, newX, newY);
        updateWindowSize(win.id, newW, newH);
      }
    };

    const handleMouseUp = () => {
      if (isDragging && snapPreview) {
        playSnapSound();
        snapWindow(win.id, snapPreview);
      }
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection(null);
      setSnapPreview(null);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, initialResize, resizeDirection, snapPreview, win.id, snapWindow]);

  const startResize = (dir: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    focusWindow(win.id);
    setIsResizing(true);
    setResizeDirection(dir);
    setInitialResize({
      x: win.x,
      y: win.y,
      width: win.width,
      height: win.height,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
    });
  };

  if (win.isMinimized) return null;

  return (
    <>
      {/* Snap Preview Ghost Box */}
      {isDragging && snapPreview && (
        <div
          className={`fixed pointer-events-none z-30 transition-all duration-200 border-2 border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)]/15 backdrop-blur-sm rounded-3xl ${
            snapPreview === 'left'
              ? 'top-2 left-2 bottom-20 w-[calc(50vw-12px)]'
              : snapPreview === 'right'
              ? 'top-2 right-2 bottom-20 w-[calc(50vw-12px)]'
              : 'top-2 left-2 right-2 bottom-20'
          }`}
        />
      )}

      {/* Main Window Surface */}
      <motion.div
        initial={isReducedMotion ? false : { opacity: 0, scale: 0.92, y: 30 }}
        animate={
          win.isMaximized
            ? {
                x: 0,
                y: 0,
                width: '100vw',
                height: 'calc(100vh - 86px)',
                borderRadius: 0,
                opacity: 1,
                scale: 1,
              }
            : {
                x: win.x,
                y: win.y,
                width: win.width,
                height: win.height,
                borderRadius: screenRadius,
                opacity: 1,
                scale: 1,
              }
        }
        exit={
          isReducedMotion
            ? undefined
            : {
                opacity: 0,
                scale: 0.25,
                y: window.innerHeight - 40,
                x: window.innerWidth / 2 - 100,
                transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] },
              }
        }
        transition={{
          type: 'spring',
          damping: 32,
          stiffness: 320,
          mass: 0.8,
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: win.zIndex,
        }}
        onClick={() => focusWindow(win.id)}
        className={`flex flex-col bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] overflow-hidden border backdrop-blur-3xl transition-all duration-200 ${
          win.isFocused
            ? 'border-[var(--md-sys-color-outline)]/40 ring-1 ring-[var(--md-sys-color-primary)]/30 shadow-[0_20px_50px_rgba(0,0,0,0.55)]'
            : 'border-[var(--md-sys-color-outline-variant)]/20 shadow-[0_8px_25px_rgba(0,0,0,0.35)] opacity-95'
        }`}
      >
        {/* Specular highlight at top border */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/10 pointer-events-none" />

        {/* Titlebar */}
        <div
          onMouseDown={handleMouseDownHeader}
          onDoubleClick={() => toggleMaximizeWindow(win.id)}
          className="h-11 px-3.5 flex items-center justify-between bg-[var(--md-sys-color-surface-container-high)]/90 border-b border-[var(--md-sys-color-outline-variant)]/20 select-none cursor-default"
        >
          {/* App identity */}
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[19px] text-[var(--md-sys-color-primary)]">
              {win.icon || 'window'}
            </span>
            <span className="text-xs font-semibold tracking-wide text-[var(--md-sys-color-on-surface)] truncate max-w-[280px]">
              {win.title}
            </span>
          </div>

          {/* Window controls (M3 pill buttons) */}
          <div className="flex items-center gap-1.5 window-control-btn">
            {/* Minimize */}
            <button
              onClick={() => {
                playMinimizeSound();
                minimizeWindow(win.id);
              }}
              title="Minimize"
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--md-sys-color-outline-variant)]/30 active:scale-95 transition-all text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]"
            >
              <span className="material-symbols-outlined text-[16px]">remove</span>
            </button>

            {/* Maximize / Restore */}
            <button
              onClick={() => {
                playClickSound();
                toggleMaximizeWindow(win.id);
              }}
              title={win.isMaximized ? 'Restore' : 'Maximize'}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--md-sys-color-outline-variant)]/30 active:scale-95 transition-all text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]"
            >
              <span className="material-symbols-outlined text-[14px]">
                {win.isMaximized ? 'collapse_content' : 'crop_square'}
              </span>
            </button>

            {/* Close */}
            <button
              onClick={() => {
                playClickSound();
                closeWindow(win.id);
              }}
              title="Close"
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--md-sys-color-error)] hover:text-[var(--md-sys-color-on-error)] active:scale-95 transition-all text-[var(--md-sys-color-on-surface-variant)]"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>

        {/* Window Body */}
        <div className="flex-1 w-full h-full overflow-hidden relative">
          {children}
        </div>

        {/* Resize handles */}
        {!win.isMaximized && (
          <>
            <div onMouseDown={(e) => startResize('top', e)} className="absolute top-0 left-2 right-2 h-2 cursor-n-resize" />
            <div onMouseDown={(e) => startResize('bottom', e)} className="absolute bottom-0 left-2 right-2 h-2 cursor-s-resize" />
            <div onMouseDown={(e) => startResize('left', e)} className="absolute left-0 top-2 bottom-2 w-2 cursor-w-resize" />
            <div onMouseDown={(e) => startResize('right', e)} className="absolute right-0 top-2 bottom-2 w-2 cursor-e-resize" />
            <div onMouseDown={(e) => startResize('bottom-right', e)} className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-se-resize" />
            <div onMouseDown={(e) => startResize('bottom-left', e)} className="absolute bottom-0 left-0 w-3.5 h-3.5 cursor-sw-resize" />
          </>
        )}
      </motion.div>
    </>
  );
};
