import { auth, currentUser } from '@clerk/nextjs/server';

export async function requireAuth() {
  const { userId } = auth();
  if (!userId) throw new Error('Unauthorized');
  return userId;
}

export async function getCurrentUser() {
  return currentUser();
}
