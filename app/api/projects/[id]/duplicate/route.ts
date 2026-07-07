import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projects, files } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await requireAuth();

  const [source] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.ownerId, userId)));

  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const sourceFiles = await db
    .select()
    .from(files)
    .where(eq(files.projectId, params.id))
    .orderBy(files.path);

  const now = Date.now();
  const newProjectId = crypto.randomUUID();

  const [newProject] = await db
    .insert(projects)
    .values({
      id: newProjectId,
      name: `${source.name} (copy)`,
      ownerId: userId,
      isPublic: false,
      createdAt: now,
    })
    .returning();

  if (sourceFiles.length > 0) {
    await db.insert(files).values(
      sourceFiles.map((f) => ({
        id: crypto.randomUUID(),
        projectId: newProjectId,
        path: f.path,
        content: f.content,
        language: f.language,
        version: 1,
        updatedAt: now,
      }))
    );
  }

  return NextResponse.json(newProject, { status: 201 });
}
