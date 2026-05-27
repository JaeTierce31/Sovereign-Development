import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB cap on fetched content

export async function POST(req: Request) {
  await requireAuth();

  const { url } = await req.json() as { url?: string };
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url required' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Only allow http/https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'Only http/https URLs are supported' }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Peregrine.ai/1.0' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Remote server returned ${res.status}` }, { status: 400 });
    }

    const contentType = res.headers.get('content-type') ?? 'text/plain';

    // Reject non-text responses
    if (!contentType.includes('text') && !contentType.includes('json') && !contentType.includes('javascript') && !contentType.includes('xml')) {
      return NextResponse.json({ error: 'URL returned a binary or unsupported content type' }, { status: 400 });
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 2 MB)' }, { status: 400 });
    }

    const content = new TextDecoder().decode(buf);
    return NextResponse.json({ content, contentType });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Fetch failed: ${msg}` }, { status: 400 });
  }
}
