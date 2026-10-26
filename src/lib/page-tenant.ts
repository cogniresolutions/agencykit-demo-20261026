import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireUser, type CurrentUser } from "@/lib/auth";
import type { Tx } from "@/lib/db";
import { TenantAccessError, withTenantSlug, type TenantContext } from "@/lib/tenant";

/** Runs a tenant-scoped query for a page; unknown or forbidden sub-accounts render 404. */
export async function tenantPage<T>(
  slug: string,
  fn: (tx: Tx, ctx: TenantContext, user: CurrentUser) => Promise<T>,
): Promise<T> {
  const user = await requireUser();
  try {
    return await withTenantSlug(user, slug, (tx, ctx) => fn(tx, ctx, user));
  } catch (err) {
    if (err instanceof TenantAccessError) notFound();
    throw err;
  }
}

export const getTenant = cache(async (slug: string) => tenantPage(slug, async (_tx, ctx, user) => ({ ...ctx, user })));
