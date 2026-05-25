"use client";
import { useRef, useEffect, useState, useCallback } from "react";

interface ProjectFile {
  id: string;
  path: string;
  content: string | null;
  language: string | null;
}

interface ExecutionPanelProps {
  files: ProjectFile[];
  activeFile: ProjectFile | null;
  scripts?: Record<string, string>;
  onClose: () => void;
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

export default function ExecutionPanel({ files, activeFile, scripts, onClose }: ExecutionPanelProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const xterm = useRef<any>(null);
  const wc = useRef<any>(null);
  const runningProcess = useRef<any>(null);
  const [status, setStatus] = useState<"idle" | "booting" | "running" | "done" | "error">("idle");
  const [exitCode, setExitCode] = useState<number | null>(null);

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
      term.writeln("\x1b[2mPeregrine Terminal — click \x1b[32m▶ Run\x1b[0m\x1b[2m to execute the active file\x1b[0m");

      const ro = new ResizeObserver(() => fit.fit());
      ro.observe(termRef.current!);
      (term as any)._resizeObserver = ro;
    })();
    return () => {
      (xterm.current as any)?._resizeObserver?.disconnect();
      term?.dispose();
    };
    // mount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = useCallback(async () => {
    if (!activeFile || status === "running" || status === "booting") return;
    const term = xterm.current;
    if (!term) return;

    term.reset();
    setExitCode(null);

    try {
      if (!wc.current) {
        setStatus("booting");
        term.writeln("\x1b[34m▶ Booting execution environment…\x1b[0m");
        const { WebContainer } = await import("@webcontainer/api");
        wc.current = await WebContainer.boot({ coep: "credentialless", workdirName: "project" });
      }

      // Mount all project files
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
        term.writeln(`\x1b[33m⚠ No runner configured for .${ext} files\x1b[0m`);
        setStatus("idle");
        return;
      }

      setStatus("running");
      term.writeln(`\x1b[32m▶ ${runner.cmd} ${runner.args(activeFile.path).join(" ")}\x1b[0m\n`);

      const proc = await wc.current.spawn(runner.cmd, runner.args(activeFile.path));
      runningProcess.current = proc;

      proc.output.pipeTo(
        new WritableStream({ write(chunk) { term.write(chunk); } })
      );

      const code = await proc.exit;
      runningProcess.current = null;
      setExitCode(code);
      setStatus("done");
      term.writeln(
        `\n\x1b[${code === 0 ? "32" : "31"}m▶ Process exited with code ${code}\x1b[0m`
      );
    } catch (e: any) {
      term.writeln(`\x1b[31m✗ ${e.message}\x1b[0m`);
      setStatus("error");
    }
  }, [activeFile, files, status]);

  const runScript = useCallback(async (scriptName: string, scriptCmd: string) => {
    if (status === "running" || status === "booting") return;
    const term = xterm.current;
    if (!term) return;

    term.reset();
    setExitCode(null);

    try {
      if (!wc.current) {
        setStatus("booting");
        term.writeln("\x1b[34m▶ Booting execution environment…\x1b[0m");
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

      setStatus("running");
      term.writeln(`\x1b[32m▶ npm run ${scriptName}\x1b[0m\x1b[2m  (${scriptCmd})\x1b[0m\n`);

      const proc = await wc.current.spawn("npm", ["run", scriptName]);
      runningProcess.current = proc;
      proc.output.pipeTo(new WritableStream({ write(chunk) { term.write(chunk); } }));

      const code = await proc.exit;
      runningProcess.current = null;
      setExitCode(code);
      setStatus("done");
      term.writeln(`\n\x1b[${code === 0 ? "32" : "31"}m▶ Process exited with code ${code}\x1b[0m`);
    } catch (e: any) {
      term.writeln(`\x1b[31m✗ ${e.message}\x1b[0m`);
      setStatus("error");
    }
  }, [files, status]);

  const stop = useCallback(async () => {
    try { await runningProcess.current?.kill(); } catch {}
    runningProcess.current = null;
    setStatus("idle");
    xterm.current?.writeln("\n\x1b[33m▶ Terminated\x1b[0m");
  }, []);

  const clear = useCallback(() => {
    xterm.current?.reset();
    xterm.current?.writeln("\x1b[2mCleared\x1b[0m");
  }, []);

  const isRunning = status === "running" || status === "booting";

  const scriptEntries = scripts ? Object.entries(scripts) : [];

  return (
    <div className="flex flex-col h-full bg-[#0f1117] border-t border-gray-700">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-700 shrink-0 bg-gray-900 flex-wrap">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Terminal
        </span>

        {/* npm script buttons */}
        {scriptEntries.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {scriptEntries.map(([name, cmd]) => (
              <button
                key={name}
                onClick={() => runScript(name, cmd)}
                disabled={isRunning}
                className="px-2 py-0.5 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 hover:text-white rounded border border-gray-700 hover:border-gray-500 transition-colors font-mono"
                title={`npm run ${name}: ${cmd}`}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {activeFile && (
            <span className="text-xs text-gray-600 truncate max-w-[140px]">{activeFile.path}</span>
          )}

          <button
            onClick={clear}
            className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            title="Clear terminal"
          >
            Clear
          </button>

          {isRunning ? (
            <button
              onClick={stop}
              disabled={status === "booting"}
              className="px-2.5 py-0.5 text-xs bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded transition-colors"
            >
              {status === "booting" ? "⟳ Booting…" : "■ Stop"}
            </button>
          ) : (
            <button
              onClick={run}
              disabled={!activeFile}
              className="px-2.5 py-0.5 text-xs bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white rounded transition-colors"
            >
              ▶ Run
            </button>
          )}

          {exitCode !== null && (
            <span className={`text-xs tabular-nums ${exitCode === 0 ? "text-green-400" : "text-red-400"}`}>
              exit {exitCode}
            </span>
          )}

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-lg leading-none transition-colors ml-1"
            title="Close terminal"
          >
            ×
          </button>
        </div>
      </div>

      <div ref={termRef} className="flex-1 min-h-0 p-1" />
    </div>
  );
}
