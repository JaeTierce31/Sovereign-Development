import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let _db: Db | undefined;

function getDb(): Db {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _db = drizzle(postgres(url), { schema });
  }
  return _db;
}

// Lazy proxy — postgres client is NOT instantiated at import time,
// only on first actual DB call. Prevents build failures when DATABASE_URL
// contains special characters or isn't set during Next.js static generation.
export const db = new Proxy({} as Db, {
  get(_, key: string | symbol) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[key];
  },
});
