// Proves that tenant A cannot read or modify tenant B's rows.
// Connects as the real application role (DATABASE_URL), exactly like the app.
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { requireEnv } from "./env.mjs";

const admin = postgres(requireEnv("DATABASE_ADMIN_URL"), { max: 1, onnotice: () => {} });
const app = postgres(requireEnv("DATABASE_URL"), { max: 1, onnotice: () => {} });

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

const TENANT_TABLES = ["contacts", "pipeline_stages", "deals", "conversations", "messages", "websites", "memberships"];

async function asTenant(sub, agency, fn) {
  return app.begin(async (tx) => {
    await tx`select set_config('app.current_sub_account', ${sub}, true)`;
    if (agency) await tx`select set_config('app.current_agency', ${agency}, true)`;
    return fn(tx);
  });
}

async function seedTenant(label) {
  const [agency] = await admin`insert into agencies (name) values (${`Isolation ${label}`}) returning id`;
  const [user] = await admin`insert into users (agency_id, email, name, password_hash, role)
    values (${agency.id}, ${`iso-${label}-${randomUUID()}@test.local`}, ${`User ${label}`}, 'x', 'member') returning id`;
  const [sub] = await admin`insert into sub_accounts (agency_id, name, slug, industry)
    values (${agency.id}, ${`Tenant ${label}`}, ${`iso-${label}-${randomUUID().slice(0, 8)}`}, 'other') returning id`;
  await admin`insert into memberships (sub_account_id, user_id, role) values (${sub.id}, ${user.id}, 'member')`;
  const [stage] = await admin`insert into pipeline_stages (sub_account_id, name, position) values (${sub.id}, 'New', 0) returning id`;
  const [contact] = await admin`insert into contacts (sub_account_id, name, email) values (${sub.id}, ${`Secret ${label}`}, ${`secret-${label}@test.local`}) returning id`;
  await admin`insert into deals (sub_account_id, stage_id, contact_id, title, value_cents) values (${sub.id}, ${stage.id}, ${contact.id}, 'Deal', 1000)`;
  const [convo] = await admin`insert into conversations (sub_account_id, contact_id, channel) values (${sub.id}, ${contact.id}, 'form') returning id`;
  await admin`insert into messages (sub_account_id, conversation_id, direction, author, body) values (${sub.id}, ${convo.id}, 'inbound', 'contact', 'hello')`;
  const slug = `iso-site-${label}-${randomUUID().slice(0, 8)}`;
  await admin`insert into websites (sub_account_id, slug, name, template, theme, business, sections, features, generated_by, published)
    values (${sub.id}, ${slug}, 'Site', 'other', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'template', ${label === "A"})`;
  await admin`insert into audit_log (agency_id, sub_account_id, actor, action, entity) values (${agency.id}, ${sub.id}, 'test', 'test.event', 'test')`;
  return { agency: agency.id, sub: sub.id, contact: contact.id, slug };
}

async function main() {
  console.log("\nAgencyKit tenant isolation test\n");
  const A = await seedTenant("A");
  const B = await seedTenant("B");

  try {
    const [role] = await app`select rolname, rolsuper, rolbypassrls from pg_roles where rolname = current_user`;
    check("app connects as a non-superuser role without BYPASSRLS", !role.rolsuper && !role.rolbypassrls, `role=${role.rolname}`);

    const [noCtx] = await app`select count(*)::int as n from contacts`;
    check("no tenant context: contacts are invisible", noCtx.n === 0, `${noCtx.n} rows`);

    for (const table of TENANT_TABLES) {
      const rows = await asTenant(A.sub, null, (tx) => tx`select count(*)::int as n from ${tx(table)} where sub_account_id = ${B.sub}`);
      check(`tenant A cannot read tenant B ${table}`, rows[0].n === 0, `${rows[0].n} rows`);
    }

    const visible = await asTenant(A.sub, null, (tx) => tx`select distinct sub_account_id from contacts`);
    check("tenant A sees only its own contacts", visible.length === 1 && visible[0].sub_account_id === A.sub);

    const secret = await asTenant(A.sub, null, (tx) => tx`select count(*)::int as n from contacts where email like 'secret-B%'`);
    check("search for tenant B data from tenant A returns nothing", secret[0].n === 0);

    let insertBlocked = false;
    try {
      await asTenant(A.sub, null, (tx) => tx`insert into contacts (sub_account_id, name) values (${B.sub}, 'Injected')`);
    } catch (err) {
      insertBlocked = /row-level security/i.test(err.message);
    }
    check("tenant A cannot insert rows into tenant B", insertBlocked);

    const updated = await asTenant(A.sub, null, (tx) => tx`update contacts set name = 'Hacked' where id = ${B.contact}`);
    check("tenant A cannot update tenant B rows", updated.count === 0, `${updated.count} rows changed`);

    const deleted = await asTenant(A.sub, null, (tx) => tx`delete from contacts where sub_account_id = ${B.sub}`);
    check("tenant A cannot delete tenant B rows", deleted.count === 0, `${deleted.count} rows deleted`);

    const subs = await asTenant(A.sub, A.agency, (tx) => tx`select id from sub_accounts`);
    check("agency A cannot list agency B sub-accounts", subs.every((s) => s.id !== B.sub));

    const audit = await asTenant(A.sub, A.agency, (tx) => tx`select count(*)::int as n from audit_log where agency_id = ${B.agency}`);
    check("agency A cannot read agency B audit log", audit[0].n === 0);

    await asTenant(A.sub, A.agency, (tx) => tx`select 1`);
    const [leak] = await app`select count(*)::int as n from contacts`;
    check("tenant context does not leak after the transaction (SET LOCAL)", leak.n === 0);

    const [pubA] = await app`select * from app_resolve_site(${A.slug})`;
    const [pubB] = await app`select * from app_resolve_site(${B.slug})`;
    check("public site lookup resolves published sites only", pubA?.sub_account_id === A.sub && !pubB);

    const [{ verified }] = await admin`select (select contacts.name from contacts where id = ${B.contact}) = 'Secret B' as verified`;
    check("tenant B data is intact after the attack attempts", verified === true);
  } finally {
    await admin`delete from agencies where id in (${A.agency}, ${B.agency})`;
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed.${failed ? " ISOLATION FAILURE." : " Tenants are isolated."}\n`);
  return failed;
}

main()
  .then(async (failed) => {
    await Promise.all([admin.end(), app.end()]);
    process.exit(failed ? 1 : 0);
  })
  .catch(async (err) => {
    console.error("[test:isolation] error:", err.message);
    await Promise.all([admin.end({ timeout: 1 }), app.end({ timeout: 1 })]);
    process.exit(1);
  });
