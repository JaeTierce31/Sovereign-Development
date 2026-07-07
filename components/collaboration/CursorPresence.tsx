"use client";
import { useCollab } from "./CollabProvider";

interface CursorData {
  userId: string;
  line: number;
  column: number;
  color: string;
}

export default function CursorPresence() {
  const { connectedUsers } = useCollab();

  if (connectedUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-1 px-2">
      {connectedUsers.map((userId) => (
        <div
          key={userId}
          className="w-6 h-6 rounded-full bg-peregrine-orange flex items-center justify-center text-xs font-bold text-white"
          title={userId}
        >
          {userId[0]?.toUpperCase()}
        </div>
      ))}
    </div>
  );
}
