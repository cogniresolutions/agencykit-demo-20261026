import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

declare global {
  var __agencykitDb: ReturnType<typeof createDb> | undefined;
}

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Run ./scripts/setup.sh and start the database.");
  }
  // The app connects as the least-privilege "agencykit_app" role, so Postgres
  // row-level security is always enforced for tenant tables.
  const client = postgres(url, { max: 10, idle_timeout: 30, prepare: true });
  return drizzle(client, { schema });
}

type Database = ReturnType<typeof createDb>;

function getDb(): Database {
  // Created lazily so `next build` works without a database.
  globalThis.__agencykitDb ??= createDb();
  return globalThis.__agencykitDb;
}

export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
