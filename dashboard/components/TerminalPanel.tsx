"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";

export default function TerminalPanel({
  terminalRef,
  onCommand,
}: {
  terminalRef: React.MutableRefObject<Terminal | null>;
  onCommand: (command: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const commandHandlerRef = useRef(onCommand);

  useEffect(() => {
    commandHandlerRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.25,
      scrollback: 500,
      convertEol: true,
      theme: {
        background: "#071018",
        foreground: "#d8e4ee",
        cursor: "#7ee787",
        selectionBackground: "#27404f",
        black: "#081014",
        brightBlack: "#587080",
        green: "#7ee787",
        brightGreen: "#9cffaa",
        cyan: "#67e8f9",
        brightCyan: "#9cf6ff",
        yellow: "#f4d35e",
        brightYellow: "#ffe88b",
        red: "#ff7b72",
        brightRed: "#ff9b95",
      },
    });

    terminal.open(containerRef.current);
    terminalRef.current = terminal;

    terminal.writeln("\x1b[1;36mRFA // AUTOMATION CONTROL CENTER\x1b[0m");
    terminal.writeln("\x1b[90mInteractive control shell. Type help for commands.\x1b[0m");
    terminal.write("\r\n\x1b[32mcontrol@rfa\x1b[0m:\x1b[36m~\x1b[0m$ ");

    let buffer = "";
    const disposable = terminal.onData((data) => {
      if (data === "\r") {
        terminal.write("\r\n");
        const command = buffer.trim();
        if (command) commandHandlerRef.current(command);
        buffer = "";
        terminal.write("\x1b[32mcontrol@rfa\x1b[0m:\x1b[36m~\x1b[0m$ ");
      } else if (data === "\x7f") {
        if (buffer.length > 0) {
          buffer = buffer.slice(0, -1);
          terminal.write("\b \b");
        }
      } else if (data >= " " && data <= "~") {
        buffer += data;
        terminal.write(data);
      }
    });

    const onResize = () => terminal.resize(Math.max(40, Math.floor((containerRef.current?.clientWidth || 700) / 8)), 18);
    window.addEventListener("resize", onResize);
    onResize();

    return () => {
      disposable.dispose();
      window.removeEventListener("resize", onResize);
      terminal.dispose();
      terminalRef.current = null;
    };
  }, [terminalRef]);

  return <div className="terminal-shell"><div ref={containerRef} className="terminal" /></div>;
}
