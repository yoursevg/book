import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Create a singleton DB connection that can be imported across the server
// Expects DATABASE_URL like: postgres://user:password@host:5432/dbname
const { DATABASE_URL } = process.env as { DATABASE_URL?: string };

export const pool = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL })
  : undefined;

export const db = pool ? drizzle(pool) : undefined as any; // Consumers should check for env presence
