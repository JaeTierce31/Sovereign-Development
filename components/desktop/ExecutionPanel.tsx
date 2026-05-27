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
  js:  { cmd: "node",    args: (f) => [f] },
  mjs: { cmd: "node",    args: (f) => [f] },
  cjs: { cmd: "node",    args: (f) => [f] },
  ts:  { cmd: "npx",    args: (f) => ["--yes", "tsx", f] },
  tsx: { cmd: "npx",    args: (f) => ["--yes", "tsx", f] },
  py:  { cmd: "python3", args: (f) => [f] },
  sh:  { cmd: "sh",      args: (f) => [f] },
};

type TabStatus = "idle" | "booting" | "running" | "done" | "error";

type TabMeta = {
  id: string;
  title: string;
  mode: "run" | "shell";
  status: TabStatus;
  exitCode: number | null;
};

type TabRuntime = {
  xterm: any;
  fitAddon: any;
  runningProcess: any;
  shellInputWriter: WritableStreamDefaultWriter<string> | null;
  shellInputDispose: (() => void) | null;
};

const TERM_OPTS = {
  theme: { background: "#0f1117", foreground: "#e2e8f0", cursor: "#60a5fa" },
  fontSize: 13,
  fontFamily: '"Fira Code", "Cascadia Code", Menlo, monospace',
  convertEol: true,
  scrollback: 5000,
  cursorBlink: true,
};

const WELCOME = "\x1b[2mPeregrine Terminal — \x1b[32m▶ Run\x1b[0m\x1b[2m executes the active file · \x1b[36mShell\x1b[0m\x1b[2m opens an interactive bash session\x1b[0m";

export default function ExecutionPanel({ files, activeFile, scripts, onClose }: ExecutionPanelProps) {
  // Shared WebContainer across all tabs
  const wc = useRef<any>(null);

  const [tabs, setTabs] = useState<TabMeta[]>([
    { id: "t1", title: "Terminal 1", mode: "run", status: "idle", exitCode: null },
  ]);
  const [activeTabId, setActiveTabId] = useState("t1");

  const tabCounter = useRef(2);
  const tabRuntimes = useRef<Map<string, TabRuntime>>(new Map());
  const termDivRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const initializedTabs = useRef<Set<string>>(new Set());
  // Mirror status in a ref so callbacks can read it without stale closures
  const tabStatusRef = useRef<Map<string, TabStatus>>(new Map([["t1", "idle"]]));

  function updateTab(id: string, update: Partial<TabMeta>) {
    if (update.status !== undefined) tabStatusRef.current.set(id, update.status);
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...update } : t)));
  }

  const initTabXterm = useCallback(async (tabId: string) => {
    if (initializedTabs.current.has(tabId)) return;
    const divEl = termDivRefs.current.get(tabId);
    if (!divEl) return;
    initializedTabs.current.add(tabId);

    const { Terminal } = await import("xterm");
    const { FitAddon } = await import("xterm-addon-fit");
    await import("xterm/css/xterm.css");

    const term = new Terminal(TERM_OPTS);
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(divEl);
    fit.fit();

    const runtime: TabRuntime = {
      xterm: term, fitAddon: fit,
      runningProcess: null, shellInputWriter: null, shellInputDispose: null,
    };
    tabRuntimes.current.set(tabId, runtime);
    term.writeln(WELCOME);

    const ro = new ResizeObserver(() => {
      fit.fit();
      const rt = tabRuntimes.current.get(tabId);
      if (rt?.shellInputWriter && rt.runningProcess?.resize) {
        try { rt.runningProcess.resize({ cols: term.cols, rows: term.rows }); } catch {}
      }
    });
    ro.observe(divEl);
    (term as any)._resizeObserver = ro;
  }, []);

  // Init first tab on mount
  useEffect(() => {
    const t = setTimeout(() => initTabXterm("t1"), 0);
    return () => clearTimeout(t);
  // mount-only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When active tab changes, init if needed and re-fit
  const prevActiveRef = useRef("t1");
  useEffect(() => {
    if (prevActiveRef.current === activeTabId) return;
    prevActiveRef.current = activeTabId;
    const rt = tabRuntimes.current.get(activeTabId);
    if (!rt) {
      requestAnimationFrame(() =>
        initTabXterm(activeTabId).then(() =>
          setTimeout(() => tabRuntimes.current.get(activeTabId)?.fitAddon?.fit(), 50)
        )
      );
    } else {
      setTimeout(() => rt.fitAddon?.fit(), 50);
    }
  }, [activeTabId, initTabXterm]);

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

  async function ensureContainer(tabId: string): Promise<boolean> {
    const rt = tabRuntimes.current.get(tabId);
    const term = rt?.xterm;
    if (!term) return false;
    if (!wc.current) {
      updateTab(tabId, { status: "booting" });
      term.writeln("\x1b[34m▶ Booting execution environment…\x1b[0m");
      try {
        const { WebContainer } = await import("@webcontainer/api");
        wc.current = await WebContainer.boot({ coep: "credentialless", workdirName: "project" });
      } catch (e: any) {
        term.writeln(`\x1b[31m✗ Boot failed: ${e.message}\x1b[0m`);
        updateTab(tabId, { status: "error" });
        return false;
      }
    }
    return true;
  }

  const addTab = useCallback(() => {
    const id = `t${tabCounter.current++}`;
    const n = tabCounter.current - 1;
    tabStatusRef.current.set(id, "idle");
    setTabs((prev) => [...prev, { id, title: `Terminal ${n}`, mode: "run", status: "idle", exitCode: null }]);
    setActiveTabId(id);
  }, []);

  const closeTab = useCallback((tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs((prev) => {
      if (prev.length <= 1) return prev;
      const rt = tabRuntimes.current.get(tabId);
      if (rt) {
        try { rt.runningProcess?.kill(); } catch {}
        rt.shellInputDispose?.();
        (rt.xterm as any)?._resizeObserver?.disconnect();
        rt.xterm?.dispose();
        tabRuntimes.current.delete(tabId);
        initializedTabs.current.delete(tabId);
        tabStatusRef.current.delete(tabId);
      }
      const next = prev.filter((t) => t.id !== tabId);
      setActiveTabId((cur) => {
        if (cur !== tabId) return cur;
        const idx = prev.findIndex((t) => t.id === tabId);
        return (next[idx] ?? next[idx - 1] ?? next[0]).id;
      });
      return next;
    });
  }, []);

  const startShell = useCallback(async () => {
    const tabId = activeTabId;
    const status = tabStatusRef.current.get(tabId) ?? "idle";
    if (status === "booting") return;
    const rt = tabRuntimes.current.get(tabId);
    const term = rt?.xterm;
    if (!rt || !term) return;

    try { await rt.runningProcess?.kill(); } catch {}
    rt.shellInputDispose?.();
    rt.shellInputDispose = null;
    rt.shellInputWriter = null;
    rt.runningProcess = null;

    term.reset();
    updateTab(tabId, { exitCode: null, mode: "shell" });

    if (!await ensureContainer(tabId)) return;

    term.writeln("\x1b[34m▶ Mounting project files…\x1b[0m");
    await wc.current.mount(buildFileTree(files));
    term.writeln("\x1b[34m▶ Starting shell…\x1b[0m\r\n");
    updateTab(tabId, { status: "running" });

    try {
      const proc = await wc.current.spawn("bash", [], {
        terminal: { cols: term.cols, rows: term.rows },
      });
      rt.runningProcess = proc;
      proc.output.pipeTo(new WritableStream({ write(chunk) { term.write(chunk); } }));

      const writer = proc.input.getWriter();
      rt.shellInputWriter = writer;
      const dispose = term.onData((data: string) => { writer.write(data).catch(() => {}); });
      rt.shellInputDispose = () => dispose.dispose();

      const code = await proc.exit;
      rt.shellInputDispose?.();
      rt.shellInputDispose = null;
      rt.shellInputWriter = null;
      rt.runningProcess = null;
      updateTab(tabId, { status: "done", exitCode: code });
      term.writeln(`\r\n\x1b[33m▶ Shell exited (${code})\x1b[0m`);
    } catch (e: any) {
      term.writeln(`\x1b[31m✗ ${e.message}\x1b[0m`);
      updateTab(tabId, { status: "error" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, files]);

  const run = useCallback(async () => {
    const tabId = activeTabId;
    const status = tabStatusRef.current.get(tabId) ?? "idle";
    if (!activeFile || status === "running" || status === "booting") return;
    const rt = tabRuntimes.current.get(tabId);
    const term = rt?.xterm;
    if (!rt || !term) return;

    try { await rt.runningProcess?.kill(); } catch {}
    rt.shellInputDispose?.();
    rt.shellInputDispose = null;
    rt.shellInputWriter = null;
    rt.runningProcess = null;

    term.reset();
    updateTab(tabId, { exitCode: null, mode: "run" });

    if (!await ensureContainer(tabId)) return;
    await wc.current.mount(buildFileTree(files));

    const ext = activeFile.path.split(".").pop() ?? "";
    const runner = RUNNERS[ext];
    if (!runner) {
      term.writeln(`\x1b[33m⚠ No runner configured for .${ext} files\x1b[0m`);
      updateTab(tabId, { status: "idle" });
      return;
    }

    updateTab(tabId, { status: "running" });
    term.writeln(`\x1b[32m▶ ${runner.cmd} ${runner.args(activeFile.path).join(" ")}\x1b[0m\n`);

    const proc = await wc.current.spawn(runner.cmd, runner.args(activeFile.path));
    rt.runningProcess = proc;
    proc.output.pipeTo(new WritableStream({ write(chunk) { term.write(chunk); } }));

    const code = await proc.exit;
    rt.runningProcess = null;
    updateTab(tabId, { exitCode: code, status: "done" });
    term.writeln(`\n\x1b[${code === 0 ? "32" : "31"}m▶ Process exited with code ${code}\x1b[0m`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, activeFile, files]);

  const runScript = useCallback(async (scriptName: string, scriptCmd: string) => {
    const tabId = activeTabId;
    const status = tabStatusRef.current.get(tabId) ?? "idle";
    if (status === "running" || status === "booting") return;
    const rt = tabRuntimes.current.get(tabId);
    const term = rt?.xterm;
    if (!rt || !term) return;

    try { await rt.runningProcess?.kill(); } catch {}
    rt.shellInputDispose?.();
    rt.shellInputDispose = null;
    rt.shellInputWriter = null;
    rt.runningProcess = null;

    term.reset();
    updateTab(tabId, { exitCode: null, mode: "run" });

    if (!await ensureContainer(tabId)) return;
    await wc.current.mount(buildFileTree(files));

    updateTab(tabId, { status: "running" });
    term.writeln(`\x1b[32m▶ npm run ${scriptName}\x1b[0m\x1b[2m  (${scriptCmd})\x1b[0m\n`);

    const proc = await wc.current.spawn("npm", ["run", scriptName]);
    rt.runningProcess = proc;
    proc.output.pipeTo(new WritableStream({ write(chunk) { term.write(chunk); } }));

    const code = await proc.exit;
    rt.runningProcess = null;
    updateTab(tabId, { exitCode: code, status: "done" });
    term.writeln(`\n\x1b[${code === 0 ? "32" : "31"}m▶ Process exited with code ${code}\x1b[0m`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, files]);

  const stop = useCallback(async () => {
    const tabId = activeTabId;
    const rt = tabRuntimes.current.get(tabId);
    if (!rt) return;
    try { await rt.runningProcess?.kill(); } catch {}
    rt.shellInputDispose?.();
    rt.shellInputDispose = null;
    rt.shellInputWriter = null;
    rt.runningProcess = null;
    updateTab(tabId, { status: "idle" });
    rt.xterm?.writeln("\n\x1b[33m▶ Terminated\x1b[0m");
  }, [activeTabId]);

  const clear = useCallback(() => {
    tabRuntimes.current.get(activeTabId)?.xterm?.reset();
  }, [activeTabId]);

  // Cleanup on unmount
  useEffect(() => {
    const rts = tabRuntimes.current;
    return () => {
      for (const rt of rts.values()) {
        try { rt.runningProcess?.kill(); } catch {}
        rt.shellInputDispose?.();
        (rt.xterm as any)?._resizeObserver?.disconnect();
        rt.xterm?.dispose();
      }
    };
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const isRunning = activeTab.status === "running" || activeTab.status === "booting";
  const isShellActive = activeTab.mode === "shell" && activeTab.status === "running";
  const scriptEntries = scripts ? Object.entries(scripts) : [];

  return (
    <div className="flex flex-col h-full bg-[#0f1117] border-t border-gray-700">
      {/* Tab strip */}
      <div className="flex items-center bg-gray-900 border-b border-gray-700 shrink-0 min-h-0 overflow-x-auto">
        <div className="flex items-center overflow-x-auto flex-1 min-w-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs shrink-0 border-r border-gray-700 transition-colors ${
                activeTabId === tab.id
                  ? "bg-[#0f1117] text-white border-b border-[#0f1117]"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
              }`}
            >
              <span className={`text-[10px] ${tab.mode === "shell" ? "text-cyan-400" : "text-green-500"}`}>
                {tab.mode === "shell" ? "$" : "▶"}
              </span>
              <span className="truncate max-w-[90px]">{tab.title}</span>
              {tab.status === "running" && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 animate-pulse" />
              )}
              {(tab.status === "done" || tab.status === "error") && tab.exitCode !== null && (
                <span className={`text-[9px] tabular-nums ${tab.exitCode === 0 ? "text-green-400" : "text-red-400"}`}>
                  {tab.exitCode}
                </span>
              )}
              {tabs.length > 1 && (
                <span
                  role="button"
                  aria-label="Close tab"
                  className="text-gray-600 hover:text-gray-300 ml-0.5 text-sm leading-none"
                  onClick={(e) => closeTab(tab.id, e)}
                >
                  ×
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={addTab}
          className="px-2 py-1.5 text-gray-600 hover:text-gray-300 text-base transition-colors shrink-0 border-r border-gray-700"
          title="New terminal tab"
        >
          +
        </button>
        <button
          onClick={onClose}
          className="px-2 py-1.5 text-gray-500 hover:text-gray-300 text-lg leading-none transition-colors shrink-0"
          title="Close terminal"
        >
          ×
        </button>
      </div>

      {/* Active tab toolbar */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-gray-700/60 shrink-0 bg-gray-900/50 flex-wrap">
        {/* Mode toggle */}
        <div className="flex items-center gap-0.5 bg-gray-800 rounded p-0.5">
          <button
            onClick={() => {
              if (activeTab.mode !== "run" && !isRunning) {
                tabRuntimes.current.get(activeTabId)?.xterm?.reset();
                updateTab(activeTabId, { mode: "run", status: "idle" });
              }
            }}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${activeTab.mode === "run" ? "bg-gray-600 text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            Run
          </button>
          <button
            onClick={() => { if (!isShellActive) startShell(); }}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${activeTab.mode === "shell" ? "bg-gray-600 text-white" : "text-gray-500 hover:text-gray-300"}`}
            title="Interactive bash shell"
          >
            Shell
          </button>
        </div>

        {/* npm script buttons (run mode only) */}
        {activeTab.mode === "run" && scriptEntries.length > 0 && (
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
          {activeTab.mode === "run" && activeFile && (
            <span className="text-xs text-gray-600 truncate max-w-[140px]">{activeFile.path}</span>
          )}
          {isShellActive && <span className="text-xs text-green-500/70">bash</span>}

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
              disabled={activeTab.status === "booting"}
              className="px-2.5 py-0.5 text-xs bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded transition-colors"
            >
              {activeTab.status === "booting" ? "⟳ Booting…" : "■ Stop"}
            </button>
          ) : activeTab.mode === "shell" ? (
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
        </div>
      </div>

      {/* Terminal divs — all in DOM, only active visible */}
      <div className="flex-1 min-h-0 relative">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            ref={(el) => { termDivRefs.current.set(tab.id, el); }}
            className="absolute inset-0 p-1"
            style={{ display: activeTabId === tab.id ? "block" : "none" }}
          />
        ))}
      </div>
    </div>
  );
}
