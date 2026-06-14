import "server-only";

import { Pool } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

let db: NodePgDatabase<typeof schema> | null = null;

export function getDb(): NodePgDatabase<typeof schema> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!db) {
    const pool = new Pool({ connectionString: databaseUrl });
    db = drizzle(pool, { schema });
  }

  return db;
}

