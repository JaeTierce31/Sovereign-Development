"use client";
import { useEffect, useRef, useState, useCallback } from "react";

interface ProjectFile {
  id: string;
  path: string;
  content: string | null;
  language: string | null;
}

const RUNNERS: Record<string, { cmd: string; args: (f: string) => string[] }> = {
  js:  { cmd: "node",   args: (f) => [f] },
  mjs: { cmd: "node",   args: (f) => [f] },
  cjs: { cmd: "node",   args: (f) => [f] },
  ts:  { cmd: "npx",   args: (f) => ["--yes", "tsx", f] },
  tsx: { cmd: "npx",   args: (f) => ["--yes", "tsx", f] },
  py:  { cmd: "python3", args: (f) => [f] },
  sh:  { cmd: "sh",     args: (f) => [f] },
};

export default function MobileTerminal({ projectId, activeFilePath }: {
  projectId: string;
  activeFilePath?: string;
}) {
  const termRef = useRef<HTMLDivElement>(null);
  const xterm = useRef<any>(null);
  const wc = useRef<any>(null);
  const runningProcess = useRef<any>(null);
  const [status, setStatus] = useState<"idle" | "booting" | "running" | "done" | "error">("idle");
  const filesRef = useRef<ProjectFile[]>([]);

  // Fetch files on mount and keep ref up-to-date
  useEffect(() => {
    fetch(`/api/projects/${projectId}/files`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: ProjectFile[]) => { filesRef.current = data; });
  }, [projectId]);

  // Boot xterm once
  useEffect(() => {
    let term: any;
    (async () => {
      if (!termRef.current || xterm.current) return;
      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("xterm-addon-fit");
      await import("xterm/css/xterm.css");

      term = new Terminal({
        theme: { background: "#0f1117", foreground: "#e2e8f0", cursor: "#60a5fa" },
        fontSize: 13,
        fontFamily: '"Fira Code", "Cascadia Code", Menlo, monospace',
        convertEol: true,
        scrollback: 2000,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(termRef.current);
      fit.fit();
      xterm.current = term;
      term.writeln("\x1b[2mPeregrine Terminal — tap \x1b[32m▶ Run\x1b[0m\x1b[2m to execute the active file\x1b[0m");

      const ro = new ResizeObserver(() => fit.fit());
      ro.observe(termRef.current!);
      (term as any)._ro = ro;
    })();
    return () => {
      (xterm.current as any)?._ro?.disconnect();
      term?.dispose();
    };
    // mount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = useCallback(async () => {
    const files = filesRef.current;
    const targetPath = activeFilePath ?? files[0]?.path;
    const activeFile = files.find((f) => f.path === targetPath) ?? files[0];
    if (!activeFile || status === "running" || status === "booting") return;

    const term = xterm.current;
    if (!term) return;

    term.reset();
    setStatus("booting");
    term.writeln(`\x1b[34m▶ Running ${activeFile.path}…\x1b[0m`);

    try {
      if (!wc.current) {
        const { WebContainer } = await import("@webcontainer/api");
        wc.current = await WebContainer.boot({ coep: "credentialless", workdirName: "project" });
      }

      const tree: Record<string, any> = {};
      for (const f of files) {
        const parts = f.path.split("/");
        let node: any = tree;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!node[parts[i]]) node[parts[i]] = { directory: {} };
          node = node[parts[i]].directory;
        }
        node[parts[parts.length - 1]] = { file: { contents: f.content ?? "" } };
      }
      await wc.current.mount(tree);

      const ext = activeFile.path.split(".").pop() ?? "";
      const runner = RUNNERS[ext];
      if (!runner) {
        term.writeln(`\x1b[33m⚠ No runner for .${ext} files\x1b[0m`);
        setStatus("idle");
        return;
      }

      setStatus("running");
      term.writeln(`\x1b[32m▶ ${runner.cmd} ${runner.args(activeFile.path).join(" ")}\x1b[0m\n`);

      const proc = await wc.current.spawn(runner.cmd, runner.args(activeFile.path));
      runningProcess.current = proc;
      proc.output.pipeTo(new WritableStream({ write(chunk) { term.write(chunk); } }));

      const code = await proc.exit;
      runningProcess.current = null;
      setStatus("done");
      term.writeln(`\n\x1b[${code === 0 ? "32" : "31"}m▶ Exited with code ${code}\x1b[0m`);
    } catch (e: any) {
      term.writeln(`\x1b[31m✗ ${e.message}\x1b[0m`);
      setStatus("error");
    }
  }, [activeFilePath, status]);

  const stop = useCallback(async () => {
    try { await runningProcess.current?.kill(); } catch {}
    runningProcess.current = null;
    setStatus("idle");
    xterm.current?.writeln("\n\x1b[33m▶ Stopped\x1b[0m");
  }, []);

  const isRunning = status === "running" || status === "booting";

  return (
    <div className="h-full flex flex-col bg-[#0f1117]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700 shrink-0 bg-gray-900">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex-1">
          Terminal
          {activeFilePath && (
            <span className="ml-1.5 font-normal normal-case text-gray-600">— {activeFilePath.split("/").pop()}</span>
          )}
        </span>
        <button
          onClick={() => { xterm.current?.reset(); }}
          className="px-2 py-0.5 text-xs text-gray-500 active:text-gray-300 transition-colors"
        >
          Clear
        </button>
        {isRunning ? (
          <button
            onClick={stop}
            disabled={status === "booting"}
            className="px-3 py-1 text-xs bg-red-700 active:bg-red-600 disabled:opacity-50 text-white rounded transition-colors"
          >
            {status === "booting" ? "Booting…" : "■ Stop"}
          </button>
        ) : (
          <button
            onClick={run}
            className="px-3 py-1 text-xs bg-green-700 active:bg-green-600 text-white rounded transition-colors"
          >
            ▶ Run
          </button>
        )}
      </div>
      <div ref={termRef} className="flex-1 min-h-0 p-1" />
    </div>
  );
}
