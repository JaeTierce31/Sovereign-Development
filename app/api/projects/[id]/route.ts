import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projects, files } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await requireAuth();

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.ownerId, userId)));

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { name } = await req.json() as { name?: string };
  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const [updated] = await db
    .update(projects)
    .set({ name: name.trim() })
    .where(eq(projects.id, params.id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await requireAuth();

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.ownerId, userId)));

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.delete(files).where(eq(files.projectId, params.id));
  await db.delete(projects).where(eq(projects.id, params.id));

  return new NextResponse(null, { status: 204 });
}
