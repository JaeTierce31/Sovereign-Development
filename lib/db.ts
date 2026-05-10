import { createClient } from "@libsql/client";

// Server-side client (used in API routes)
export const serverDb = createClient({
  url: process.env.TURSO_DB_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Client-side embedded replica creator (used in browser)
export function createLocalDb(projectId: string) {
  return createClient({
    url: `file:project-${projectId}.db`,
    syncUrl: process.env.NEXT_PUBLIC_TURSO_SYNC_URL!,
    authToken: process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN!,
  });
}
