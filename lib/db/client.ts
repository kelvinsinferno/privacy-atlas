import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import * as schema from "./schema";

// LOCAL DEV ONLY: route the Neon HTTP driver at a local proxy sitting in front of a
// plain Postgres (see docker-compose.dev.yml). Gated on NEON_LOCAL=1 so production —
// which talks to real Neon over HTTPS — is never affected.
if (process.env.NEON_LOCAL === "1") {
  neonConfig.fetchEndpoint = (host: string) => `http://${host}:4444/sql`;
}

// Lazy singleton so importing this without DATABASE_URL (e.g. tests that mock the query layer)
// doesn't throw. Routes call db() which requires the env.
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
export function db() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  _db = drizzle(neon(url), { schema });
  return _db;
}
