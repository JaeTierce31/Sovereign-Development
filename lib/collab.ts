import * as Y from 'yjs';

// WebTransport will be used in production; MVP uses WebSocket fallback
export function connectToProject(projectId: string, userId: string) {
  const doc = new Y.Doc();

  const workerUrl = process.env.NEXT_PUBLIC_CF_WORKER_URL || 'wss://collab.peregrine.dev';
  const ws = new WebSocket(`${workerUrl}/ws?project=${projectId}&user=${userId}`);

  ws.binaryType = 'arraybuffer';

  ws.onmessage = (event) => {
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
  };
}
