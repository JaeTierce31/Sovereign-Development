import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { syncUser } from '@/lib/syncUser';
import { db } from '@/lib/db';
import { projects, files } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  _req: Request,
  { params }: { params: { projectId: string } }
) {
  const userId = await requireAuth();
  await syncUser(userId);

  const [source] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, params.projectId));

  if (!source || !source.isPublic) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const sourceFiles = await db
    .select()
    .from(files)
    .where(eq(files.projectId, params.projectId))
    .orderBy(files.path);

  const now = Date.now();
  const newProjectId = crypto.randomUUID();

  const [newProject] = await db
    .insert(projects)
    .values({
      id: newProjectId,
      name: `${source.name} (fork)`,
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
