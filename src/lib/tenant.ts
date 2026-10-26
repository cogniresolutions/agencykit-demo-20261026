import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { memberships, subAccounts } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth";
import { db, type Tx } from "@/lib/db";

/**
 * Layer 1 of tenant isolation.
 *
 * Every read or write of tenant data goes through one of these helpers.
 * They open a transaction, pin the tenant with SET LOCAL semantics
 * (set_config(..., true)) so Postgres row-level security (layer 2) applies,
 * and verify on the server that the signed-in user may access the tenant.
 */

export class TenantAccessError extends Error {
  constructor() {
    super("You do not have access to this sub-account.");
    this.name = "TenantAccessError";
  }
}

export type SubAccount = typeof subAccounts.$inferSelect;
export type TenantContext = {
  subAccount: SubAccount;
  /** Effective role inside the sub-account. Agency owners and admins are admins everywhere. */
  role: "admin" | "member";
};

async function pinAgency(tx: Tx, agencyId: string) {
  await tx.execute(sql`select set_config('app.current_agency', ${agencyId}, true)`);
}

async function pinSubAccount(tx: Tx, subAccountId: string) {
  await tx.execute(sql`select set_config('app.current_sub_account', ${subAccountId}, true)`);
}

async function authorize(tx: Tx, user: CurrentUser, sub: SubAccount | undefined): Promise<TenantContext> {
  if (!sub || sub.agencyId !== user.agencyId) throw new TenantAccessError();
  if (user.role === "owner" || user.role === "admin") return { subAccount: sub, role: "admin" };
  const [m] = await tx
    .select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.subAccountId, sub.id), eq(memberships.userId, user.id)))
    .limit(1);
  if (!m) throw new TenantAccessError();
  return { subAccount: sub, role: m.role };
}

/** Agency-level work: only agency-scoped rows are visible. */
export async function withAgency<T>(user: CurrentUser, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await pinAgency(tx, user.agencyId);
    return fn(tx);
  });
}

/** Tenant work by sub-account id. Throws TenantAccessError when the user is not a member. */
export async function withTenant<T>(
  user: CurrentUser,
  subAccountId: string,
  fn: (tx: Tx, ctx: TenantContext) => Promise<T>,
): Promise<T> {
  if (!/^[0-9a-f-]{36}$/i.test(subAccountId)) throw new TenantAccessError();
  return db.transaction(async (tx) => {
    await pinAgency(tx, user.agencyId);
    await pinSubAccount(tx, subAccountId);
    const [sub] = await tx.select().from(subAccounts).where(eq(subAccounts.id, subAccountId)).limit(1);
    const ctx = await authorize(tx, user, sub);
    return fn(tx, ctx);
  });
}

/** Tenant work by URL slug (used by /app/[sub]/* pages). */
export async function withTenantSlug<T>(
  user: CurrentUser,
  slug: string,
  fn: (tx: Tx, ctx: TenantContext) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await pinAgency(tx, user.agencyId);
    const [sub] = await tx
      .select()
      .from(subAccounts)
      .where(and(eq(subAccounts.agencyId, user.agencyId), eq(subAccounts.slug, slug)))
      .limit(1);
    const ctx = await authorize(tx, user, sub);
    await pinSubAccount(tx, ctx.subAccount.id);
    return fn(tx, ctx);
  });
}

/**
 * Public, unauthenticated work for a single tenant (website forms and chat).
 * Only the sub-account is pinned, so RLS limits every query to that tenant.
 */
export async function withPublicTenant<T>(subAccountId: string, fn: (tx: Tx, sub: SubAccount) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await pinSubAccount(tx, subAccountId);
    const [sub] = await tx.select().from(subAccounts).where(eq(subAccounts.id, subAccountId)).limit(1);
    if (!sub) throw new TenantAccessError();
    return fn(tx, sub);
  });
}

/** Lists sub-accounts the user can open. */
export async function listAccessibleSubAccounts(user: CurrentUser): Promise<SubAccount[]> {
  return withAgency(user, async (tx) => {
    if (user.role === "owner" || user.role === "admin") {
      return tx.select().from(subAccounts).where(eq(subAccounts.agencyId, user.agencyId)).orderBy(subAccounts.createdAt);
    }
    const rows = await tx
      .select({ sub: subAccounts })
      .from(subAccounts)
      .innerJoin(memberships, eq(memberships.subAccountId, subAccounts.id))
      .where(and(eq(subAccounts.agencyId, user.agencyId), eq(memberships.userId, user.id)))
      .orderBy(subAccounts.createdAt);
    return rows.map((r) => r.sub);
  });
}
