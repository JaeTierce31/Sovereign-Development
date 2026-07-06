import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { streamText } from 'ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_PROJECT_CONTEXT = 20_000;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userKey = req.headers.get('X-User-Anthropic-Key') ?? '';
  const anthropicKey = userKey || process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (!anthropicKey && !groqKey) {
    return NextResponse.json(
      { error: 'AI assistant not configured. Add ANTHROPIC_API_KEY or GROQ_API_KEY to enable, or set your own key in Settings.' },
      { status: 503 }
    );
  }

  const { message, fileContent, language, history, projectFiles } = await req.json() as {
    message: string;
    fileContent?: string;
    language?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    projectFiles?: Array<{ path: string; content: string }>;
  };

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  let projectContext = '';
  if (projectFiles && projectFiles.length > 0) {
    let total = 0;
    const parts: string[] = [];
    for (const f of projectFiles) {
      const block = `=== ${f.path} ===\n${f.content}`;
      if (total + block.length > MAX_PROJECT_CONTEXT) break;
      parts.push(block);
      total += block.length + 2;
    }
    if (parts.length > 0) {
      projectContext = `\n\nProject files (${parts.length} of ${projectFiles.length}):\n${parts.join('\n\n')}`;
    }
  }

  const systemPrompt = [
    'You are Peregrine AI, an expert coding assistant embedded in a cloud IDE.',
    'Be concise and direct. Prefer code examples over long explanations.',
    'When showing code, always use markdown fenced code blocks with the language specified.',
    fileContent
      ? `\nThe user is currently editing a ${language ?? 'text'} file:\n\`\`\`${language ?? ''}\n${fileContent.slice(0, 8000)}\n\`\`\``
      : '',
    projectContext,
  ].join('\n');

  const messages = [
    ...(history ?? []),
    { role: 'user' as const, content: message },
  ];

  if (anthropicKey) {
    const { createAnthropic } = await import('@ai-sdk/anthropic');
    const anthropic = createAnthropic({ apiKey: anthropicKey });
    const result = streamText({
      model: anthropic('claude-sonnet-4-6'),
      system: systemPrompt,
      messages,
      maxOutputTokens: 2048,
    });
    return result.toTextStreamResponse();
  }

  const { createGroq } = await import('@ai-sdk/groq');
  const groq = createGroq({ apiKey: groqKey! });
  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: systemPrompt,
    messages,
    maxOutputTokens: 2048,
  });
  return result.toTextStreamResponse();
}
