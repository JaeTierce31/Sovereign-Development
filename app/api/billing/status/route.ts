import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user] = await db.select({
    tier: users.tier,
    email: users.email,
  }).from(users).where(eq(users.id, userId));

  return NextResponse.json({ tier: user?.tier ?? 'free', email: user?.email ?? '' });
}
