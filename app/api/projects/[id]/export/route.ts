import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projects, files } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import JSZip from 'jszip';

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

  const zip = new JSZip();
  for (const file of rows) {
    zip.file(file.path, file.content ?? '');
  }

  const buffer = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  const safeName = project.name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}.zip"`,
    },
  });
}
