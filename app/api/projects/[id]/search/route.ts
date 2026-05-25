import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projects, files } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

export interface SearchResult {
  fileId: string;
  path: string;
  lineNumber: number;
  lineText: string;
  matchStart: number;
  matchEnd: number;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await requireAuth();
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.trim();
  const isRegex = searchParams.get('regex') === '1';
  const caseSensitive = searchParams.get('cs') === '1';

  if (!query || query.length < 1) {
    return NextResponse.json({ results: [] });
  }

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.ownerId, userId)));

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let regex: RegExp;
  try {
    regex = new RegExp(isRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');
  } catch {
    return NextResponse.json({ error: 'Invalid regex' }, { status: 400 });
  }

  const rows = await db
    .select({ id: files.id, path: files.path, content: files.content })
    .from(files)
    .where(eq(files.projectId, params.id))
    .orderBy(files.path);

  const results: SearchResult[] = [];
  const MAX_RESULTS = 200;

  for (const file of rows) {
    if (!file.content) continue;
    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length && results.length < MAX_RESULTS; i++) {
      const line = lines[i];
      const truncated = line.length > 200 ? line.slice(0, 200) : line;
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(truncated)) !== null && results.length < MAX_RESULTS) {
        results.push({
          fileId: file.id,
          path: file.path,
          lineNumber: i + 1,
          lineText: truncated,
          matchStart: match.index,
          matchEnd: match.index + match[0].length,
        });
        if (match[0].length === 0) { regex.lastIndex++; break; }
      }
    }
    if (results.length >= MAX_RESULTS) break;
  }

  return NextResponse.json({ results });
}
