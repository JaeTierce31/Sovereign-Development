"use client";

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function AIIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export default function MobileActionBar({
  activePane,
  onPaneChange,
  onAiOpen,
}: {
  activePane: string;
  onPaneChange: (p: "editor" | "terminal") => void;
  onAiOpen?: () => void;
}) {
  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50">
      <div className="bg-white/10 backdrop-blur-md rounded-full px-6 py-3 flex gap-6 shadow-lg border border-white/20">
        <button
          onClick={() => onPaneChange(activePane === "terminal" ? "editor" : "terminal")}
          className={`p-2 rounded-full transition-colors ${
            activePane === "terminal" ? "bg-white/20 text-white" : "text-white/70"
          }`}
          title="Toggle terminal"
        >
          <TerminalIcon className="w-6 h-6" />
        </button>
        <button
          onClick={() => onPaneChange("terminal")}
          className="p-2 bg-green-500 hover:bg-green-400 active:bg-green-600 rounded-full text-white transition-colors"
          title="Run code"
        >
          <PlayIcon className="w-8 h-8" />
        </button>
        <button
          onClick={onAiOpen}
          className="p-2 text-white/70 hover:text-white transition-colors"
          title="Open AI assistant"
        >
          <AIIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
