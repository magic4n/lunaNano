import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWindowStore, AppWindow } from '../../stores/windowStore';
import { useSettingsStore } from '../../stores/settingsStore';

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

        // Snap edge preview
        if (e.clientX < 20) {
          snapWindow(win.id, 'left');
          setIsDragging(false);
          return;
        } else if (e.clientX > window.innerWidth - 20) {
          snapWindow(win.id, 'right');
          setIsDragging(false);
          return;
        } else if (e.clientY < 10) {
          snapWindow(win.id, 'fullscreen');
          setIsDragging(false);
          return;
        }

        updateWindowPosition(win.id, newX, newY);
      } else if (isResizing && resizeDirection) {
        const deltaX = e.clientX - initialResize.startMouseX;
        const deltaY = e.clientY - initialResize.startMouseY;

        let newW = initialResize.width;
        let newH = initialResize.height;
        let newX = initialResize.x;
        let newY = initialResize.y;

        if (resizeDirection.includes('right')) newW = Math.max(320, initialResize.width + deltaX);
        if (resizeDirection.includes('bottom')) newH = Math.max(220, initialResize.height + deltaY);
        if (resizeDirection.includes('left')) {
          const clamped = Math.max(320, initialResize.width - deltaX);
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
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection(null);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, initialResize, resizeDirection, win.id]);

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
    <motion.div
      initial={isReducedMotion ? false : { opacity: 0, scale: 0.92, y: 30 }}
      animate={
        win.isMaximized
          ? {
              x: 0,
              y: 0,
              width: '100vw',
              height: 'calc(100vh - 84px)',
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
              scale: 0.3,
              y: window.innerHeight,
              transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] },
            }
      }
      transition={{
        type: 'spring',
        damping: 30,
        stiffness: 300,
        mass: 0.8,
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: win.zIndex,
      }}
      onClick={() => focusWindow(win.id)}
      className={`flex flex-col bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] shadow-2xl overflow-hidden border backdrop-blur-3xl transition-colors duration-200 ${
        win.isFocused
          ? 'border-[var(--md-sys-color-outline)]/40 ring-1 ring-[var(--md-sys-color-primary)]/30'
          : 'border-[var(--md-sys-color-outline-variant)]/20 opacity-95'
      }`}
    >
      {/* Titlebar */}
      <div
        onMouseDown={handleMouseDownHeader}
        onDoubleClick={() => toggleMaximizeWindow(win.id)}
        className="h-11 px-3 flex items-center justify-between bg-[var(--md-sys-color-surface-container-high)] border-b border-[var(--md-sys-color-outline-variant)]/20 select-none cursor-default"
      >
        {/* App info */}
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[18px] text-[var(--md-sys-color-primary)]">
            {win.icon}
          </span>
          <span className="text-xs font-semibold tracking-wide text-[var(--md-sys-color-on-surface)] truncate max-w-[280px]">
            {win.title}
          </span>
        </div>

        {/* Window controls (M3 pill buttons) */}
        <div className="flex items-center gap-1.5 window-control-btn">
          {/* Minimize */}
          <button
            onClick={() => minimizeWindow(win.id)}
            title="Minimize"
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--md-sys-color-outline-variant)]/30 active:scale-95 transition-all text-[var(--md-sys-color-on-surface-variant)]"
          >
            <span className="material-symbols-outlined text-[16px]">remove</span>
          </button>

          {/* Maximize / Restore */}
          <button
            onClick={() => toggleMaximizeWindow(win.id)}
            title={win.isMaximized ? 'Restore' : 'Maximize'}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--md-sys-color-outline-variant)]/30 active:scale-95 transition-all text-[var(--md-sys-color-on-surface-variant)]"
          >
            <span className="material-symbols-outlined text-[14px]">
              {win.isMaximized ? 'collapse_content' : 'crop_square'}
            </span>
          </button>

          {/* Close */}
          <button
            onClick={() => closeWindow(win.id)}
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
          <div onMouseDown={(e) => startResize('top', e)} className="absolute top-0 left-2 right-2 h-1.5 cursor-n-resize" />
          <div onMouseDown={(e) => startResize('bottom', e)} className="absolute bottom-0 left-2 right-2 h-1.5 cursor-s-resize" />
          <div onMouseDown={(e) => startResize('left', e)} className="absolute left-0 top-2 bottom-2 w-1.5 cursor-w-resize" />
          <div onMouseDown={(e) => startResize('right', e)} className="absolute right-0 top-2 bottom-2 w-1.5 cursor-e-resize" />
          <div onMouseDown={(e) => startResize('bottom-right', e)} className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize" />
          <div onMouseDown={(e) => startResize('bottom-left', e)} className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize" />
        </>
      )}
    </motion.div>
  );
};
