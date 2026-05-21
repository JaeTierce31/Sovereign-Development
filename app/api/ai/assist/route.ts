import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { streamText } from 'ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (!anthropicKey && !groqKey) {
    return NextResponse.json(
      { error: 'AI assistant not configured. Add ANTHROPIC_API_KEY or GROQ_API_KEY to enable.' },
      { status: 503 }
    );
  }

  const { message, fileContent, language, history } = await req.json() as {
    message: string;
    fileContent?: string;
    language?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  };

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const systemPrompt = [
    'You are Peregrine AI, an expert coding assistant embedded in a cloud IDE.',
    'Be concise and direct. Prefer code examples over long explanations.',
    'When showing code, always use markdown fenced code blocks with the language specified.',
    fileContent
      ? `\nThe user is currently editing a ${language ?? 'text'} file with this content:\n\`\`\`${language ?? ''}\n${fileContent.slice(0, 8000)}\n\`\`\``
      : '',
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

  // Groq fallback — llama-3.3-70b-versatile for coding when Anthropic key isn't set
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
