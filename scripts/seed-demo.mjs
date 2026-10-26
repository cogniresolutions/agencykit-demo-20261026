// Creates the "Northstar Digital" demo agency with an owner account.
// No sub-accounts are created: add them in the UI.
// The password is random and printed once. Re-run with --reset-password to rotate it.
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import postgres from "postgres";
import { requireEnv } from "./env.mjs";

const EMAIL = "demo@agencykit.local";
const sql = postgres(requireEnv("DATABASE_ADMIN_URL"), { max: 1, onnotice: () => {} });
const reset = process.argv.includes("--reset-password");

function banner(lines) {
  const width = Math.max(...lines.map((l) => l.length)) + 4;
  console.log(`\n${"=".repeat(width)}`);
  for (const l of lines) console.log(`  ${l}`);
  console.log(`${"=".repeat(width)}\n`);
}

async function main() {
  const password = randomBytes(12).toString("base64url");
  const hash = await bcrypt.hash(password, 12);
  const [existing] = await sql`select id from users where email = ${EMAIL}`;
  if (existing && !reset) {
    console.log(`[seed:demo] Demo agency already exists (${EMAIL}). Use --reset-password to print a new password.`);
    return;
  }
  if (existing) {
    await sql`update users set password_hash = ${hash} where id = ${existing.id}`;
  } else {
    await sql.begin(async (tx) => {
      const [agency] = await tx`insert into agencies (name) values ('Northstar Digital') returning id`;
      const [user] = await tx`
        insert into users (agency_id, email, name, password_hash, role)
        values (${agency.id}, ${EMAIL}, 'Avery Stone', ${hash}, 'owner') returning id`;
      await tx`
        insert into audit_log (agency_id, actor, actor_user_id, action, entity, entity_id, metadata)
        values (${agency.id}, 'seed script', ${user.id}, 'agency.created', 'agency', ${agency.id}, ${sql.json({ demo: true })})`;
    });
  }
  banner([
    "AgencyKit demo login (shown once, store it in your password manager)",
    `  Email:    ${EMAIL}`,
    `  Password: ${password}`,
  ]);
}

main()
  .then(() => sql.end())
  .catch(async (err) => {
    console.error("[seed:demo] failed:", err.message);
    await sql.end({ timeout: 1 });
    process.exit(1);
  });
