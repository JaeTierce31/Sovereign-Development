import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projects, files } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; fileId: string } }
) {
  const userId = await requireAuth();

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.ownerId, userId)));

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { path } = await req.json();
  if (!path?.trim()) return NextResponse.json({ error: 'Path required' }, { status: 400 });

  const [file] = await db
    .update(files)
    .set({ path: path.trim(), updatedAt: Date.now() })
    .where(and(eq(files.id, params.fileId), eq(files.projectId, params.id)))
    .returning();

  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

  return NextResponse.json(file);
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string; fileId: string } }
) {
  const userId = await requireAuth();

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.ownerId, userId)));

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { content } = await req.json();

  const [file] = await db
    .update(files)
    .set({ content, updatedAt: Date.now(), version: 1 })
    .where(and(eq(files.id, params.fileId), eq(files.projectId, params.id)))
    .returning();

  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

  return NextResponse.json(file);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; fileId: string } }
) {
  const userId = await requireAuth();

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.ownerId, userId)));

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db
    .delete(files)
    .where(and(eq(files.id, params.fileId), eq(files.projectId, params.id)));

  return new NextResponse(null, { status: 204 });
}
