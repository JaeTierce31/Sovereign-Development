import { NextRequest, NextResponse } from 'next/server';
import { deployProject } from '@/lib/deploy';

export async function POST(req: NextRequest) {
  const { projectId, files } = await req.json();
  if (!projectId || !files) {
    return NextResponse.json({ error: 'Missing projectId or files' }, { status: 400 });
  }
  const url = await deployProject(projectId, files);
  return NextResponse.json({ url });
}
