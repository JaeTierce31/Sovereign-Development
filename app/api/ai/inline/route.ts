import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { streamText } from 'ai';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userKey = req.headers.get('X-User-Anthropic-Key') ?? '';
  const anthropicKey = userKey || process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (!anthropicKey && !groqKey) {
    return NextResponse.json(
      { error: 'AI not configured. Add ANTHROPIC_API_KEY or GROQ_API_KEY, or set your own key in Settings.' },
      { status: 503 }
    );
  }

  const { prompt, selection, language, context } = await req.json() as {
    prompt: string;
    selection?: string;
    language?: string;
    context?: string;
  };

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
  }

  const system = [
    `You are an expert ${language ?? 'code'} assistant. Respond with ONLY code — no explanation, no markdown fences, no preamble.`,
    'Output exactly the code that should be inserted or replace the selection. Nothing else.',
    context ? `\nSurrounding context:\n${context.slice(0, 3000)}` : '',
  ].join('\n');

  const userMessage = selection
    ? `Selection:\n${selection}\n\nInstruction: ${prompt}`
    : `Instruction: ${prompt}`;

  if (anthropicKey) {
    const { createAnthropic } = await import('@ai-sdk/anthropic');
    const anthropic = createAnthropic({ apiKey: anthropicKey });
    const result = streamText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system,
      messages: [{ role: 'user', content: userMessage }],
      maxOutputTokens: 1024,
    });
    return result.toTextStreamResponse();
  }

  const { createGroq } = await import('@ai-sdk/groq');
  const groq = createGroq({ apiKey: groqKey! });
  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system,
    messages: [{ role: 'user', content: userMessage }],
    maxOutputTokens: 1024,
  });
  return result.toTextStreamResponse();
}
