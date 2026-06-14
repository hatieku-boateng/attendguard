import "server-only";

import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";

// Configure dynamic query fetch with automatic retries globally
neonConfig.fetchFunction = async (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) => {
  let attempts = 3;
  let delay = 300;
  while (attempts > 0) {
    try {
      const response = await fetch(input, init);
      if (response.status >= 500 && attempts > 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempts--;
        delay *= 2;
        continue;
      }
      return response;
    } catch (error) {
      if (attempts > 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempts--;
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
  return fetch(input, init);
};

let db: NeonHttpDatabase<typeof schema> | null = null;

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!db) {
    db = drizzle(neon(databaseUrl), { schema });
  }

  return db;
}
