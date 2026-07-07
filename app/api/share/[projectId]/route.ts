import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, files } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _req: Request,
  { params }: { params: { projectId: string } }
) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, params.projectId));

  if (!project || !project.isPublic) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(files)
    .where(eq(files.projectId, params.projectId))
    .orderBy(files.path);

  return NextResponse.json({ project, files: rows });
}
