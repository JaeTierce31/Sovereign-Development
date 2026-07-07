import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { syncUser } from '@/lib/syncUser';
import { db } from '@/lib/db';
import { projects, files } from '@/drizzle/schema';
import JSZip from 'jszip';

const LANG_MAP: Record<string, string> = {
  js: 'javascript', jsx: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  md: 'markdown', json: 'json',
  css: 'css', html: 'html',
  py: 'python', sh: 'shell',
};

function inferLang(path: string): string {
  return LANG_MAP[path.split('.').pop() ?? ''] ?? 'plaintext';
}

const SKIP = new Set(['.DS_Store', 'Thumbs.db', '.git']);
const MAX_FILE_SIZE = 512 * 1024; // 512 KB per file
const MAX_FILES = 200;

export async function POST(req: Request) {
  const userId = await requireAuth();
  await syncUser(userId);

  const formData = await req.formData();
  const zipFile = formData.get('zip');
  const projectName = (formData.get('name') as string | null)?.trim();

  if (!(zipFile instanceof Blob)) {
    return NextResponse.json({ error: 'zip file required' }, { status: 400 });
  }

  const buffer = Buffer.from(await zipFile.arrayBuffer());
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return NextResponse.json({ error: 'Invalid ZIP file' }, { status: 400 });
  }

  // Detect common top-level prefix (e.g. "myproject/") and strip it
  const allPaths = Object.keys(zip.files).filter((p) => !zip.files[p].dir);
  const strippable = allPaths.every((p) => p.includes('/'));
  const prefix = strippable
    ? allPaths.reduce((acc, p) => {
        const seg = p.split('/')[0] + '/';
        return acc === null ? seg : acc === seg ? acc : '';
      }, null as string | null) ?? ''
    : '';

  const now = Date.now();
  const projectId = crypto.randomUUID();
  const name = projectName || (prefix ? prefix.slice(0, -1) : 'Imported Project');

  const [project] = await db
    .insert(projects)
    .values({ id: projectId, name, ownerId: userId, isPublic: false, createdAt: now })
    .returning();

  const fileEntries: { id: string; projectId: string; path: string; content: string; language: string; version: number; updatedAt: number }[] = [];
  let count = 0;

  for (const [rawPath, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const filename = rawPath.split('/').pop() ?? '';
    if (SKIP.has(filename) || filename.startsWith('.')) continue;
    if (count >= MAX_FILES) break;

    const stripped = prefix ? rawPath.slice(prefix.length) : rawPath;
    if (!stripped) continue;

    const content = await entry.async('string').catch(() => null);
    if (content === null) continue; // binary file — skip
    if (content.length > MAX_FILE_SIZE) continue;

    fileEntries.push({
      id: crypto.randomUUID(),
      projectId,
      path: stripped,
      content,
      language: inferLang(stripped),
      version: 1,
      updatedAt: now,
    });
    count++;
  }

  if (fileEntries.length > 0) {
    await db.insert(files).values(fileEntries);
  }

  return NextResponse.json({ ...project, fileCount: fileEntries.length }, { status: 201 });
}
