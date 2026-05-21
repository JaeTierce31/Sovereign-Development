import * as Y from 'yjs';

type PeerCallback = (userId: string) => void;

export function connectToProject(projectId: string, userId: string) {
  const doc = new Y.Doc();
  const peerJoinCallbacks: PeerCallback[] = [];
  const peerLeaveCallbacks: PeerCallback[] = [];

  const workerUrl = process.env.NEXT_PUBLIC_CF_WORKER_URL || 'wss://collab.peregrine.dev';
  const ws = new WebSocket(`${workerUrl}/ws?project=${projectId}&user=${userId}`);
  ws.binaryType = 'arraybuffer';

  ws.onmessage = (event) => {
    try {
      // Try to parse as JSON presence message first
      const text = event.data instanceof ArrayBuffer
        ? new TextDecoder().decode(event.data)
        : event.data as string;
      const msg = JSON.parse(text);
      if (msg.type === 'join') { peerJoinCallbacks.forEach((cb) => cb(msg.userId)); return; }
      if (msg.type === 'leave') { peerLeaveCallbacks.forEach((cb) => cb(msg.userId)); return; }
    } catch {
      // Not JSON — treat as yjs binary update
    }

    const update = event.data instanceof ArrayBuffer
      ? new Uint8Array(event.data)
      : new TextEncoder().encode(event.data as string);
    Y.applyUpdate(doc, update);
  };

  doc.on('update', (update: Uint8Array) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(update);
  });

  return {
    doc,
    send: (update: Uint8Array) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(update);
    },
    onPeerJoin: (cb: PeerCallback) => { peerJoinCallbacks.push(cb); },
    onPeerLeave: (cb: PeerCallback) => { peerLeaveCallbacks.push(cb); },
    destroy: () => { ws.close(); doc.destroy(); },
  };
}
