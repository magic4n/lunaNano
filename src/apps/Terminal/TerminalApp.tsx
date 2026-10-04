import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { useIpcStore } from '../../stores/ipcStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface TerminalTab {
  id: string;
  title: string;
  sessionId: string;
}

interface TerminalAppProps {
  initialCommand?: string;
}

export const TerminalApp: React.FC<TerminalAppProps> = ({ initialCommand }) => {
  const { send, subscribePty } = useIpcStore();
  const { settings } = useSettingsStore();

  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: 'tab-1', title: 'Shell 1', sessionId: `pty-${Date.now()}-1` },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [fontSize, setFontSize] = useState<number>(settings.terminal.fontSize || 14);
  const [termStats, setTermStats] = useState<{ cols: number; rows: number }>({ cols: 80, rows: 24 });

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  useEffect(() => {
    if (!terminalRef.current) return;

    // Dispose old instance if switching
    if (xtermInstance.current) {
      xtermInstance.current.dispose();
      xtermInstance.current = null;
    }

    const term = new Terminal({
      fontFamily: settings.terminal.fontFamily || 'JetBrains Mono, monospace',
      fontSize,
      cursorBlink: settings.terminal.cursorBlink,
      cursorStyle: (settings.terminal.cursorStyle as any) || 'bar',
      scrollback: settings.terminal.historySize || 5000,
      theme: {
        background: '#0c0e14',
        foreground: '#e2e2e6',
        cursor: '#a8c7fa',
        selectionBackground: 'rgba(168, 199, 250, 0.35)',
        black: '#1a1c23',
        red: '#ffb4ab',
        green: '#7ada99',
        yellow: '#f7d26d',
        blue: '#a8c7fa',
        magenta: '#dfb8d8',
        cyan: '#99d9e6',
        white: '#e2e2e6',
        brightBlack: '#44474e',
        brightRed: '#ff897d',
        brightGreen: '#5bd380',
        brightYellow: '#eec752',
        brightBlue: '#80aff8',
        brightMagenta: '#d59dc9',
        brightCyan: '#7fd0e0',
        brightWhite: '#ffffff',
      },
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalRef.current);
    try {
      fitAddon.fit();
      setTermStats({ cols: term.cols, rows: term.rows });
    } catch (e) {}

    xtermInstance.current = term;
    fitAddonRef.current = fitAddon;

    // Subscribe to IPC PTY data
    const unsubscribe = subscribePty(activeTab.sessionId, (data: string) => {
      term.write(data);
    });

    // Handle user input
    term.onData((data) => {
      send({
        type: 'pty:write',
        sessionId: activeTab.sessionId,
        data,
      });
    });

    // Spawn PTY session in compositor
    send({
      type: 'pty:spawn',
      sessionId: activeTab.sessionId,
      cols: term.cols || 80,
      rows: term.rows || 24,
      shell: settings.terminal.shell || '/bin/bash',
    });

    if (initialCommand) {
      setTimeout(() => {
        send({
          type: 'pty:write',
          sessionId: activeTab.sessionId,
          data: `${initialCommand}\n`,
        });
      }, 300);
    }

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        setTermStats({ cols: term.cols, rows: term.rows });
        send({
          type: 'pty:resize',
          sessionId: activeTab.sessionId,
          cols: term.cols,
          rows: term.rows,
        });
      } catch (e) {}
    });

    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      unsubscribe();
      send({ type: 'pty:kill', sessionId: activeTab.sessionId });
      term.dispose();
    };
  }, [activeTab.sessionId, fontSize]);

  const addTab = () => {
    const nextNum = tabs.length + 1;
    const newTab: TerminalTab = {
      id: `tab-${Date.now()}`,
      title: `Shell ${nextNum}`,
      sessionId: `pty-${Date.now()}-${nextNum}`,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const remaining = tabs.filter((t) => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[0].id);
    }
  };

  const clearTerminal = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col select-none"
      style={{
        backgroundColor: `rgba(12, 14, 20, ${settings.terminal.transparency || 0.95})`,
      }}
    >
      {/* Top Tab Bar & Toolbar */}
      <div className="flex items-center justify-between px-2 pt-1 border-b border-[var(--md-sys-color-outline-variant)]/20 bg-[var(--md-sys-color-surface-container)]/80">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-xs font-semibold cursor-pointer border-t border-x transition-colors ${
                  isActive
                    ? 'bg-[#0c0e14] border-[var(--md-sys-color-outline-variant)]/40 text-[var(--md-sys-color-primary)]'
                    : 'bg-transparent border-transparent text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">terminal</span>
                <span className="truncate max-w-[100px]">{tab.title}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => closeTab(tab.id, e)}
                    className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-white/10"
                  >
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={addTab}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--md-sys-color-outline-variant)]/20 text-[var(--md-sys-color-on-surface-variant)] active:scale-95 transition-all ml-1"
            title="New Terminal Tab"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 pb-1">
          <button
            onClick={() => setFontSize((s) => Math.max(10, s - 1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--md-sys-color-outline-variant)]/20 text-[var(--md-sys-color-on-surface-variant)] text-xs font-bold"
            title="Decrease Font Size"
          >
            A-
          </button>
          <button
            onClick={() => setFontSize((s) => Math.min(24, s + 1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--md-sys-color-outline-variant)]/20 text-[var(--md-sys-color-on-surface-variant)] text-xs font-bold"
            title="Increase Font Size"
          >
            A+
          </button>
          <button
            onClick={clearTerminal}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--md-sys-color-outline-variant)]/20 text-[var(--md-sys-color-on-surface-variant)]"
            title="Clear Terminal"
          >
            <span className="material-symbols-outlined text-[16px]">clear_all</span>
          </button>
        </div>
      </div>

      {/* Terminal View */}
      <div className="flex-1 w-full p-2 overflow-hidden">
        <div ref={terminalRef} className="w-full h-full overflow-hidden select-text" />
      </div>

      {/* Bottom Status Bar */}
      <div className="h-6 px-3 bg-[#08090d] border-t border-[var(--md-sys-color-outline-variant)]/15 flex items-center justify-between text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
          <span>{settings.terminal.shell || '/bin/bash'}</span>
          <span>•</span>
          <span>{termStats.cols} × {termStats.rows}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>PTY Active</span>
          <span>•</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
};
