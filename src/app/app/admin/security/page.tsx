import { sql } from "drizzle-orm";
import { CheckCircle2, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Badge, Card, PageHeader } from "@/components/ui";
import { TENANT_TABLES } from "@/db/schema";
import { isAgencyAdmin, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { STATIC_SECURITY_HEADERS } from "@/lib/security-headers";

export const metadata: Metadata = { title: "Security check" };

type Check = { title: string; status: "pass" | "warn"; detail: string };

function dbHost(url: string | undefined) {
  try {
    return url ? new URL(url).hostname : "";
  } catch {
    return "";
  }
}

export default async function SecurityPage() {
  const user = await requireUser();
  if (!isAgencyAdmin(user)) notFound();

  const secret = process.env.AUTH_SECRET ?? "";
  const uniqueChars = new Set(secret).size;
  const [role] = await db.execute<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }>(
    sql`select rolname, rolsuper, rolbypassrls from pg_roles where rolname = current_user`,
  );
  const rls = await db.execute<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean; policies: number }>(sql`
    select c.relname, c.relrowsecurity, c.relforcerowsecurity,
           (select count(*)::int from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relname in (${sql.join(TENANT_TABLES.map((t) => sql`${t}`), sql`, `)})
    order by c.relname`);
  const rlsMissing = TENANT_TABLES.filter((t) => !rls.find((r) => r.relname === t && r.relrowsecurity && r.policies > 0));
  const h = await headers();
  const cspActive = Boolean(h.get("content-security-policy")?.includes("nonce-"));
  const cspNoEval = !h.get("content-security-policy")?.includes("unsafe-eval");
  const host = dbHost(process.env.DATABASE_URL);
  const appUrl = process.env.APP_URL ?? "";

  const checks: Check[] = [
    {
      title: "AUTH_SECRET strength",
      status: secret.length >= 64 && uniqueChars >= 20 ? "pass" : "warn",
      detail:
        secret.length >= 64
          ? `${secret.length} characters of random data. Session cookies are signed with HS256.`
          : `Only ${secret.length} characters. Generate a new one with: openssl rand -base64 64`,
    },
    {
      title: "Row-level security on every tenant table",
      status: rlsMissing.length === 0 ? "pass" : "warn",
      detail:
        rlsMissing.length === 0
          ? `${rls.length} tenant tables have RLS enabled and forced with policies (pg_class.relrowsecurity): ${rls.map((r) => r.relname).join(", ")}.`
          : `Missing RLS on: ${rlsMissing.join(", ")}. Run the migrations.`,
    },
    {
      title: "App database role is least-privilege",
      status: role && !role.rolsuper && !role.rolbypassrls ? "pass" : "warn",
      detail: role
        ? `Connected as "${role.rolname}": superuser=${role.rolsuper}, bypassrls=${role.rolbypassrls}.${role.rolsuper || role.rolbypassrls ? " RLS will NOT apply. Use the agencykit_app role in DATABASE_URL." : " Postgres enforces tenant policies on every query."}`
        : "Could not read role attributes.",
    },
    {
      title: "Database not publicly exposed",
      status: ["127.0.0.1", "localhost", "db", "::1"].includes(host) ? "pass" : "warn",
      detail: ["127.0.0.1", "localhost", "db", "::1"].includes(host)
        ? `DATABASE_URL points at "${host}". Docker Compose binds Postgres to 127.0.0.1 only.`
        : `DATABASE_URL points at "${host || "unknown"}". Make sure the database is not reachable from the internet and requires TLS.`,
    },
    {
      title: "Security headers active",
      status: cspActive && cspNoEval ? "pass" : "warn",
      detail: cspActive
        ? `Per-request nonce CSP${cspNoEval ? " without unsafe-eval" : " (dev mode allows unsafe-eval)"}, X-Frame-Options, ${STATIC_SECURITY_HEADERS.map((x) => x.key).join(", ")}.`
        : "The CSP header was not found on this request. Check that src/proxy.ts is running.",
    },
    {
      title: "HTTPS",
      status: appUrl.startsWith("https://") ? "pass" : "warn",
      detail: appUrl.startsWith("https://")
        ? `APP_URL is ${appUrl}. HSTS is sent on every response.`
        : "Running on http. That is fine on localhost; in production put the app behind a TLS reverse proxy (Caddy, Nginx, Traefik) and set APP_URL to https.",
    },
    {
      title: "Session cookie flags",
      status: process.env.COOKIE_SECURE === "false" ? "warn" : "pass",
      detail: process.env.COOKIE_SECURE === "false" ? "COOKIE_SECURE=false: cookies can travel over plain http." : "httpOnly, Secure, SameSite=Lax, 7-day expiry. Server actions also verify the Origin header.",
    },
    {
      title: "Public signup",
      status: process.env.ALLOW_SIGNUP === "true" ? "warn" : "pass",
      detail: process.env.ALLOW_SIGNUP === "true" ? "ALLOW_SIGNUP=true: anyone who can reach the app can create an agency." : "Closed after the first agency. New users are added by an owner or admin.",
    },
  ];
  const passed = checks.filter((c) => c.status === "pass").length;

  return (
    <div className="mx-auto max-w-[1100px] px-10 py-10">
      <PageHeader eyebrow={user.agencyName} title="Security check" description="Live checks against this running instance and its database." />
      <Card className="relative mb-6 overflow-hidden p-6">
        <div className="accent-glow pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative flex items-center gap-5">
          <span className={`grid size-14 place-items-center rounded-2xl ${passed === checks.length ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
            {passed === checks.length ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
          </span>
          <div>
            <p className="text-2xl font-semibold tracking-tight text-white">
              {passed} of {checks.length} checks passing
            </p>
            <p className="mt-1 text-sm text-ink-300">
              Tenant isolation is enforced twice: server-side membership checks in every data call, and Postgres row-level security.
            </p>
          </div>
        </div>
      </Card>
      <div className="grid gap-3">
        {checks.map((c) => (
          <Card key={c.title} className="flex items-start gap-4 p-5">
            {c.status === "pass" ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-success" /> : <TriangleAlert size={20} className="mt-0.5 shrink-0 text-warning" />}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-white">{c.title}</h2>
                <Badge tone={c.status === "pass" ? "success" : "warning"}>{c.status === "pass" ? "Pass" : "Review"}</Badge>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink-300">{c.detail}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
