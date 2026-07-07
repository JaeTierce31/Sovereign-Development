"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { connectToProject } from "@/lib/collab";

interface CollabContextValue {
  doc: any | null;
  send: ((update: Uint8Array) => void) | null;
  connectedUsers: string[];
}

const CollabContext = createContext<CollabContextValue>({
  doc: null,
  send: null,
  connectedUsers: [],
});

export function CollabProvider({
  projectId,
  userId,
  children,
}: {
  projectId: string;
  userId: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<CollabContextValue>({
    doc: null,
    send: null,
    connectedUsers: [userId],
  });

  useEffect(() => {
    const { doc, send, onPeerJoin, onPeerLeave, destroy } = connectToProject(projectId, userId);
    setState((prev) => ({ ...prev, doc, send, connectedUsers: [userId] }));

    onPeerJoin((peerId: string) => {
      setState((prev) => ({
        ...prev,
        connectedUsers: prev.connectedUsers.includes(peerId)
          ? prev.connectedUsers
          : [...prev.connectedUsers, peerId],
      }));
    });

    onPeerLeave((peerId: string) => {
      setState((prev) => ({
        ...prev,
        connectedUsers: prev.connectedUsers.filter((id) => id !== peerId),
      }));
    });

    return () => destroy();
  }, [projectId, userId]);

  return <CollabContext.Provider value={state}>{children}</CollabContext.Provider>;
}

export const useCollab = () => useContext(CollabContext);
