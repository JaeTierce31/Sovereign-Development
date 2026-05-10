export async function getAISuggestion(context: string): Promise<string> {
  // On-device via Web Worker if WebGPU available
  if (typeof window !== 'undefined' && 'gpu' in navigator) {
    const worker = new Worker(new URL('../workers/ai.worker.ts', import.meta.url));
    return new Promise((resolve) => {
      worker.onmessage = (e) => {
        if (e.data.type === 'result') resolve(e.data.text);
      };
      worker.postMessage({ type: 'complete', context });
    });
  }
  // Fallback to cloud API (Pro tier)
  const res = await fetch('/api/ai/complete', {
    method: 'POST',
    body: JSON.stringify({ context }),
  });
  const data = await res.json();
  return data.completion;
}
