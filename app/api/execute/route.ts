import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { command } = await req.json();
  if (!command) {
    return NextResponse.json({ error: 'Missing command' }, { status: 400 });
  }
  // Execution is handled client-side via WebContainers for security.
  // This endpoint serves as a fallback for server-side execution (Pro tier).
  return NextResponse.json({ output: '', error: 'Server execution not yet implemented' }, { status: 501 });
}
