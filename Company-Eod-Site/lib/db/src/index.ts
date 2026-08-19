import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Drizzle date columns configured with mode: "string" expect PostgreSQL DATE
// values to remain YYYY-MM-DD strings instead of being converted to Date objects.
pg.types.setTypeParser(1082, (value) => value);

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";
