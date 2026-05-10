"use client";
import { useEffect, useRef } from "react";

interface TerminalProps {
  onReady?: (term: any) => void;
}

export default function Terminal({ onReady }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let term: any;
    (async () => {
      const { Terminal: XTerm } = await import('xterm');
      const { FitAddon } = await import('xterm-addon-fit');
      await import('xterm/css/xterm.css');

      if (!containerRef.current) return;
      term = new XTerm({
        theme: { background: "#0F172A", foreground: "#ffffff" },
        fontSize: 14,
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      fitAddon.fit();
      onReady?.(term);
    })();

    return () => term?.dispose();
  // onReady is a mount-only callback; intentionally excluded from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
