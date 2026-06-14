import { config } from "dotenv";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "../src/db/schema";

// Load local environment variables
config({ path: ".env.local" });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  console.log("Running migrations on local database...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Database migrations applied successfully!");
  
  // Close pool connection
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration script failed:", err);
  process.exit(1);
});
