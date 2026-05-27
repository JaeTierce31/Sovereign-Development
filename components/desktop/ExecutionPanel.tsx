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
  const fitAddon = useRef<any>(null);
  const wc = useRef<any>(null);
  const runningProcess = useRef<any>(null);
  const shellInputWriter = useRef<WritableStreamDefaultWriter<string> | null>(null);
  const shellInputDispose = useRef<(() => void) | null>(null);
  const [mode, setMode] = useState<"run" | "shell">("run");
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
        scrollback: 5000,
        cursorBlink: true,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(termRef.current);
      fit.fit();
      xterm.current = term;
      fitAddon.current = fit;
      term.writeln("\x1b[2mPeregrine Terminal — \x1b[32m▶ Run\x1b[0m\x1b[2m executes the active file · \x1b[36mShell\x1b[0m\x1b[2m opens an interactive bash session\x1b[0m");

      const ro = new ResizeObserver(() => {
        fit.fit();
        if (shellInputWriter.current && runningProcess.current?.resize) {
          try { runningProcess.current.resize({ cols: term.cols, rows: term.rows }); } catch {}
        }
      });
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

  async function ensureContainer(): Promise<boolean> {
    const term = xterm.current;
    if (!term) return false;
    if (!wc.current) {
      setStatus("booting");
      term.writeln("\x1b[34m▶ Booting execution environment…\x1b[0m");
      try {
        const { WebContainer } = await import("@webcontainer/api");
        wc.current = await WebContainer.boot({ coep: "credentialless", workdirName: "project" });
      } catch (e: any) {
        term.writeln(`\x1b[31m✗ Boot failed: ${e.message}\x1b[0m`);
        setStatus("error");
        return false;
      }
    }
    return true;
  }

  function buildFileTree(projectFiles: ProjectFile[]): Record<string, any> {
    const tree: Record<string, any> = {};
    for (const f of projectFiles) {
      const parts = f.path.split("/");
      let node: any = tree;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!node[parts[i]]) node[parts[i]] = { directory: {} };
        node = node[parts[i]].directory;
      }
      node[parts[parts.length - 1]] = { file: { contents: f.content ?? "" } };
    }
    return tree;
  }

  const startShell = useCallback(async () => {
    const term = xterm.current;
    if (!term || status === "booting") return;

    try { await runningProcess.current?.kill(); } catch {}
    shellInputDispose.current?.();
    shellInputDispose.current = null;
    shellInputWriter.current = null;
    runningProcess.current = null;

    term.reset();
    setExitCode(null);
    setMode("shell");

    if (!await ensureContainer()) return;

    term.writeln("\x1b[34m▶ Mounting project files…\x1b[0m");
    await wc.current.mount(buildFileTree(files));
    term.writeln("\x1b[34m▶ Starting shell…\x1b[0m\r\n");
    setStatus("running");

    try {
      const proc = await wc.current.spawn("bash", [], {
        terminal: { cols: term.cols, rows: term.rows },
      });
      runningProcess.current = proc;

      proc.output.pipeTo(new WritableStream({ write(chunk) { term.write(chunk); } }));

      const writer = proc.input.getWriter();
      shellInputWriter.current = writer;

      const dispose = term.onData((data: string) => { writer.write(data).catch(() => {}); });
      shellInputDispose.current = () => dispose.dispose();

      const code = await proc.exit;
      shellInputDispose.current?.();
      shellInputDispose.current = null;
      shellInputWriter.current = null;
      runningProcess.current = null;
      setStatus("done");
      setExitCode(code);
      term.writeln(`\r\n\x1b[33m▶ Shell exited (${code})\x1b[0m`);
    } catch (e: any) {
      term.writeln(`\x1b[31m✗ ${e.message}\x1b[0m`);
      setStatus("error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, status]);

  const run = useCallback(async () => {
    if (!activeFile || status === "running" || status === "booting") return;
    const term = xterm.current;
    if (!term) return;

    try { await runningProcess.current?.kill(); } catch {}
    shellInputDispose.current?.();
    shellInputDispose.current = null;
    shellInputWriter.current = null;
    runningProcess.current = null;

    term.reset();
    setExitCode(null);
    setMode("run");

    if (!await ensureContainer()) return;

    await wc.current.mount(buildFileTree(files));

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
    proc.output.pipeTo(new WritableStream({ write(chunk) { term.write(chunk); } }));

    const code = await proc.exit;
    runningProcess.current = null;
    setExitCode(code);
    setStatus("done");
    term.writeln(`\n\x1b[${code === 0 ? "32" : "31"}m▶ Process exited with code ${code}\x1b[0m`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, files, status]);

  const runScript = useCallback(async (scriptName: string, scriptCmd: string) => {
    if (status === "running" || status === "booting") return;
    const term = xterm.current;
    if (!term) return;

    try { await runningProcess.current?.kill(); } catch {}
    shellInputDispose.current?.();
    shellInputDispose.current = null;
    shellInputWriter.current = null;
    runningProcess.current = null;

    term.reset();
    setExitCode(null);
    setMode("run");

    if (!await ensureContainer()) return;

    await wc.current.mount(buildFileTree(files));

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, status]);

  const stop = useCallback(async () => {
    try { await runningProcess.current?.kill(); } catch {}
    shellInputDispose.current?.();
    shellInputDispose.current = null;
    shellInputWriter.current = null;
    runningProcess.current = null;
    setStatus("idle");
    xterm.current?.writeln("\n\x1b[33m▶ Terminated\x1b[0m");
  }, []);

  const clear = useCallback(() => { xterm.current?.reset(); }, []);

  const isRunning = status === "running" || status === "booting";
  const isShellActive = mode === "shell" && status === "running";
  const scriptEntries = scripts ? Object.entries(scripts) : [];

  return (
    <div className="flex flex-col h-full bg-[#0f1117] border-t border-gray-700">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-700 shrink-0 bg-gray-900 flex-wrap">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Terminal</span>

        {/* Mode toggle */}
        <div className="flex items-center gap-0.5 bg-gray-800 rounded p-0.5">
          <button
            onClick={() => { if (mode !== "run" && !isRunning) { xterm.current?.reset(); setMode("run"); setStatus("idle"); } }}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${mode === "run" ? "bg-gray-600 text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            Run
          </button>
          <button
            onClick={() => { if (!isShellActive) startShell(); }}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${mode === "shell" ? "bg-gray-600 text-white" : "text-gray-500 hover:text-gray-300"}`}
            title="Interactive bash shell"
          >
            Shell
          </button>
        </div>

        {/* npm script buttons (run mode only) */}
        {mode === "run" && scriptEntries.length > 0 && (
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
          {mode === "run" && activeFile && (
            <span className="text-xs text-gray-600 truncate max-w-[140px]">{activeFile.path}</span>
          )}
          {isShellActive && <span className="text-xs text-green-500/70">bash</span>}

          <button onClick={clear} className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-300 transition-colors" title="Clear terminal">
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
          ) : mode === "shell" ? (
            <button
              onClick={startShell}
              className="px-2.5 py-0.5 text-xs bg-cyan-700 hover:bg-cyan-600 text-white rounded transition-colors"
            >
              $ Shell
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

          {exitCode !== null && mode === "run" && (
            <span className={`text-xs tabular-nums ${exitCode === 0 ? "text-green-400" : "text-red-400"}`}>
              exit {exitCode}
            </span>
          )}

          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none transition-colors ml-1" title="Close terminal">×</button>
        </div>
      </div>

      <div ref={termRef} className="flex-1 min-h-0 p-1" />
    </div>
  );
}
