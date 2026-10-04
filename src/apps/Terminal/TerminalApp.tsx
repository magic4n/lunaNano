import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { useIpcStore } from '../../stores/ipcStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface TerminalAppProps {
  initialCommand?: string;
}

export const TerminalApp: React.FC<TerminalAppProps> = ({ initialCommand }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionId = useRef(`pty-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);

  const { send, subscribePty } = useIpcStore();
  const { settings } = useSettingsStore();

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      fontFamily: settings.terminal.fontFamily || 'JetBrains Mono, monospace',
      fontSize: settings.terminal.fontSize || 14,
      cursorBlink: settings.terminal.cursorBlink,
      cursorStyle: settings.terminal.cursorStyle || 'bar',
      scrollback: settings.terminal.historySize || 5000,
      theme: {
        background: '#0d0f14',
        foreground: '#e2e2e6',
        cursor: '#a8c7fa',
        selectionBackground: 'rgba(168, 199, 250, 0.3)',
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
    fitAddon.fit();

    xtermInstance.current = term;
    fitAddonRef.current = fitAddon;

    // Subscribe to IPC PTY data
    const unsubscribe = subscribePty(sessionId.current, (data: string) => {
      term.write(data);
    });

    // Handle user input
    term.onData((data) => {
      send({
        type: 'pty:write',
        sessionId: sessionId.current,
        data,
      });
    });

    // Spawn PTY session in compositor
    send({
      type: 'pty:spawn',
      sessionId: sessionId.current,
      cols: term.cols || 80,
      rows: term.rows || 24,
      shell: settings.terminal.shell || '/bin/bash',
    });

    if (initialCommand) {
      setTimeout(() => {
        send({
          type: 'pty:write',
          sessionId: sessionId.current,
          data: `${initialCommand}\n`,
        });
      }, 300);
    }

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        send({
          type: 'pty:resize',
          sessionId: sessionId.current,
          cols: term.cols,
          rows: term.rows,
        });
      } catch (e) {
        // ignore resize on hidden
      }
    });

    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      unsubscribe();
      send({ type: 'pty:kill', sessionId: sessionId.current });
      term.dispose();
    };
  }, []);

  return (
    <div
      className="w-full h-full p-2 flex flex-col"
      style={{
        backgroundColor: `rgba(13, 15, 20, ${settings.terminal.transparency || 0.95})`,
      }}
    >
      <div ref={terminalRef} className="w-full h-full overflow-hidden" />
    </div>
  );
};
