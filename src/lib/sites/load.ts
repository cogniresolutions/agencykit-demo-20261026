import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { cache } from "react";
import { websites } from "@/db/schema";
import { db, type Tx } from "@/lib/db";
import type { Business, Features, Sections, SiteRecord, Theme } from "@/lib/sites/schema";
import { withPublicTenant } from "@/lib/tenant";

export function toSiteRecord(w: typeof websites.$inferSelect): SiteRecord {
  return {
    id: w.id,
    slug: w.slug,
    name: w.name,
    template: w.template,
    theme: w.theme as Theme,
    business: w.business as Business,
    sections: w.sections as Sections,
    features: w.features as Features,
    published: w.published,
    generatedBy: w.generatedBy,
  };
}

/** Resolves a published site to its tenant via a narrow SECURITY DEFINER lookup. */
export async function resolveSiteTenant(slug: string): Promise<{ subAccountId: string; websiteId: string } | null> {
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  const rows = await db.execute<{ sub_account_id: string; website_id: string }>(sql`select * from app_resolve_site(${slug})`);
  const row = rows[0];
  return row ? { subAccountId: row.sub_account_id, websiteId: row.website_id } : null;
}

export async function loadSiteInTenant(tx: Tx, subAccountId: string, websiteId: string) {
  const [w] = await tx
    .select()
    .from(websites)
    .where(and(eq(websites.id, websiteId), eq(websites.subAccountId, subAccountId), eq(websites.published, true)))
    .limit(1);
  return w ? toSiteRecord(w) : null;
}

export const getPublicSite = cache(async (slug: string): Promise<SiteRecord | null> => {
  const ref = await resolveSiteTenant(slug);
  if (!ref) return null;
  return withPublicTenant(ref.subAccountId, (tx) => loadSiteInTenant(tx, ref.subAccountId, ref.websiteId));
});
