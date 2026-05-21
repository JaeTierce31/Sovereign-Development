import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projects, files } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const userId = await requireAuth();

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.ownerId, userId)));

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const rows = await db
    .select()
    .from(files)
    .where(eq(files.projectId, params.id))
    .orderBy(files.path);

  return NextResponse.json(rows);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const userId = await requireAuth();

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.ownerId, userId)));

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { path: filePath } = await req.json() as { path: string };
  if (!filePath?.trim()) return NextResponse.json({ error: 'path is required' }, { status: 400 });

  const ext = filePath.split('.').pop() ?? '';
  const langMap: Record<string, string> = {
    js: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    md: 'markdown', json: 'json',
    css: 'css', html: 'html',
    py: 'python', sh: 'shell',
  };

  const [file] = await db
    .insert(files)
    .values({
      id: randomUUID(),
      projectId: params.id,
      path: filePath.trim(),
      content: '',
      language: langMap[ext] ?? 'plaintext',
      updatedAt: Date.now(),
    })
    .returning();

  return NextResponse.json(file, { status: 201 });
}
