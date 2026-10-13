import { Pool } from "pg";
import { env } from "./env.js";

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
  // Scope all unqualified table references (users, accounts) to a dedicated
  // schema so this app can share a Postgres instance with other projects
  // without name collisions.
  options: "-c search_path=otp_desk,public,extensions",
});
