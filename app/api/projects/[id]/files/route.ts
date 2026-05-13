import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projects, files } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

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
