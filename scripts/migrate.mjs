// Applies SQL migrations from ./drizzle in order and provisions the
// least-privilege application role used for row-level security.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { ROOT, requireEnv } from "./env.mjs";

const adminUrl = requireEnv("DATABASE_ADMIN_URL");
const appPassword = requireEnv("APP_DB_PASSWORD");
if (appPassword.length < 16) {
  console.error("[migrate] APP_DB_PASSWORD must be at least 16 characters.");
  process.exit(1);
}

const sql = postgres(adminUrl, { max: 1, onnotice: () => {} });
const dir = path.join(ROOT, "drizzle");

async function waitForDb(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      await sql`select 1`;
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("database not reachable");
}

async function main() {
  await waitForDb();
  await sql`select pg_advisory_lock(727274)`;
  try {
    await sql`create extension if not exists pgcrypto`;
    await sql`create schema if not exists agencykit_meta`;
    await sql`create table if not exists agencykit_meta.migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )`;

    // App role: login only, never superuser, never bypasses RLS.
    await sql.begin(async (tx) => {
      await tx`select set_config('agencykit.app_pw', ${appPassword}, true)`;
      await tx`DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agencykit_app') THEN
            EXECUTE format('CREATE ROLE agencykit_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD %L', current_setting('agencykit.app_pw'));
          ELSE
            EXECUTE format('ALTER ROLE agencykit_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD %L', current_setting('agencykit.app_pw'));
          END IF;
        END
      $$`;
    });

    const applied = new Set((await sql`select name from agencykit_meta.migrations`).map((r) => r.name));
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const content = readFileSync(path.join(dir, file), "utf8");
      const statements = content
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean);
      await sql.begin(async (tx) => {
        for (const statement of statements) {
          // Statements come from version-controlled migration files only.
          await tx.unsafe(statement);
        }
        await tx`insert into agencykit_meta.migrations (name) values (${file})`;
      });
      console.log(`[migrate] applied ${file}`);
      count++;
    }
    console.log(count ? `[migrate] ${count} migration(s) applied.` : "[migrate] database is up to date.");
  } finally {
    await sql`select pg_advisory_unlock(727274)`;
  }
}

main()
  .then(() => sql.end())
  .catch(async (err) => {
    console.error("[migrate] failed:", err.message);
    await sql.end({ timeout: 1 });
    process.exit(1);
  });
