import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projects } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await requireAuth();

  const [project] = await db
    .select({ isPublic: projects.isPublic })
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.ownerId, userId)));

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ isPublic: project.isPublic ?? false });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await requireAuth();

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.ownerId, userId)));

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { isPublic } = await req.json() as { isPublic: boolean };

  const [updated] = await db
    .update(projects)
    .set({ isPublic: Boolean(isPublic) })
    .where(eq(projects.id, params.id))
    .returning();

  return NextResponse.json(updated);
}
