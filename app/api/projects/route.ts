import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { syncUser } from '@/lib/syncUser';
import { db } from '@/lib/db';
import { projects, files } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const userId = await requireAuth();
  await syncUser(userId);
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, userId))
    .orderBy(projects.createdAt);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const userId = await requireAuth();
  await syncUser(userId);
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const now = Date.now();
  const projectId = crypto.randomUUID();

  const [project] = await db
    .insert(projects)
    .values({ id: projectId, name: name.trim(), ownerId: userId, isPublic: false, createdAt: now })
    .returning();

  await db.insert(files).values([
    {
      id: crypto.randomUUID(),
      projectId,
      path: 'index.js',
      content: '// Welcome to Peregrine\nconsole.log("Hello, world!");\n',
      language: 'javascript',
      version: 1,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      projectId,
      path: 'README.md',
      content: `# ${name.trim()}\n\nA Peregrine project.\n`,
      language: 'markdown',
      version: 1,
      updatedAt: now,
    },
  ]);

  return NextResponse.json(project, { status: 201 });
}
