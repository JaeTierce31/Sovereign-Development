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

function RocketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M8 22h8" />
    </svg>
  );
}

export default function MobileActionBar({
  activePane,
  onPaneChange,
}: {
  activePane: string;
  onPaneChange: (p: any) => void;
}) {
  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50">
      <div className="bg-white/10 backdrop-blur-md rounded-full px-6 py-3 flex gap-6 shadow-lg border border-white/20">
        <button
          onClick={() => onPaneChange(activePane === 'editor' ? 'terminal' : 'editor')}
          className="p-2 text-white"
        >
          <TerminalIcon className="w-6 h-6" />
        </button>
        <button onClick={() => {/* Run */}} className="p-2 bg-green-500 rounded-full text-white">
          <PlayIcon className="w-8 h-8" />
        </button>
        <button onClick={() => {/* Deploy */}} className="p-2 text-white">
          <RocketIcon className="w-6 h-6" />
        </button>
        <button onClick={() => {/* Voice */}} className="p-2 text-white">
          <MicrophoneIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
