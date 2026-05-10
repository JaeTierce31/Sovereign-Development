"use client";
import { useEffect, useRef } from "react";

export default function MobileTerminal({ projectId }: { projectId: string }) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamic import to avoid SSR issues with xterm
    let term: any;
    (async () => {
      const { Terminal } = await import('xterm');
      const { FitAddon } = await import('xterm-addon-fit');
      await import('xterm/css/xterm.css');

      if (!terminalRef.current) return;
      term = new Terminal({
        theme: { background: "#0F172A", foreground: "#ffffff" },
        fontSize: 14,
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();

      // TODO: connect to WebContainer output stream
      term.writeln("Peregrine Terminal – ready.");
    })();

    return () => term?.dispose();
  }, [projectId]);

  return <div ref={terminalRef} className="h-full w-full p-2" />;
}
