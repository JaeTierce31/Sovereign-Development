import { currentUser } from '@clerk/nextjs/server';
import { db } from './db';
import { users } from '@/drizzle/schema';

export async function syncUser(userId: string) {
  const clerk = await currentUser();
  if (!clerk) return;
  const email = clerk.emailAddresses[0]?.emailAddress ?? `${userId}@unknown`;
  const username = clerk.username ?? clerk.id;
  await db
    .insert(users)
    .values({ id: userId, email, username, tier: 'free', createdAt: Date.now() })
    .onConflictDoNothing();
}
