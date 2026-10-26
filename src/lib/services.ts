import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { pipelineStages, subAccounts, websites } from "@/db/schema";
import { audit } from "@/lib/audit";
import { isAgencyAdmin, type CurrentUser } from "@/lib/auth";
import { generateSections } from "@/lib/sites/generate";
import { businessSchema, featuresSchema, industryValues, styleValues } from "@/lib/sites/schema";
import { withAgency, withTenant } from "@/lib/tenant";
import { RESERVED_SLUGS, hexColorSchema, slugify } from "@/lib/validation";

/** Shared business logic used by server actions and the JSON API. */

export class ServiceError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export const createSubAccountSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  industry: z.enum(industryValues),
  brandColor: hexColorSchema,
});

const DEFAULT_STAGES = [
  { name: "New lead", isWon: false },
  { name: "Contacted", isWon: false },
  { name: "Qualified", isWon: false },
  { name: "Proposal sent", isWon: false },
  { name: "Won", isWon: true },
];

export async function createSubAccount(user: CurrentUser, input: z.infer<typeof createSubAccountSchema>, ip: string) {
  if (!isAgencyAdmin(user)) throw new ServiceError("Only agency owners and admins can create sub-accounts.", 403);
  return withAgency(user, async (tx) => {
    const base = slugify(input.name, 32);
    let candidate = RESERVED_SLUGS.has(base) ? `${base}-1` : base;
    for (let i = 2; i < 100; i++) {
      const [taken] = await tx
        .select({ id: subAccounts.id })
        .from(subAccounts)
        .where(and(eq(subAccounts.agencyId, user.agencyId), eq(subAccounts.slug, candidate)))
        .limit(1);
      if (!taken) break;
      candidate = `${base}-${i}`;
    }
    const [sub] = await tx
      .insert(subAccounts)
      .values({
        agencyId: user.agencyId,
        name: input.name,
        slug: candidate,
        industry: input.industry,
        brandColor: input.brandColor.toLowerCase(),
      })
      .returning();
    // Pin the new tenant so the default pipeline passes row-level security.
    await tx.execute(sql`select set_config('app.current_sub_account', ${sub.id}, true)`);
    await tx
      .insert(pipelineStages)
      .values(DEFAULT_STAGES.map((s, position) => ({ subAccountId: sub.id, name: s.name, isWon: s.isWon, position })));
    await audit(tx, {
      agencyId: user.agencyId,
      subAccountId: sub.id,
      actor: user.email,
      actorUserId: user.id,
      action: "sub_account.created",
      entity: "sub_account",
      entityId: sub.id,
      ip,
      metadata: { name: sub.name, industry: sub.industry },
    });
    return sub;
  });
}

export const generateWebsiteSchema = z.object({
  industry: z.enum(industryValues),
  business: businessSchema,
  style: z.enum(styleValues),
  features: featuresSchema,
});

export async function createWebsite(user: CurrentUser, subId: string, input: z.infer<typeof generateWebsiteSchema>, ip: string) {
  // Verify access before spending time on generation.
  const sub = await withTenant(user, subId, async (_tx, ctx) => ctx.subAccount);
  const { sections, generatedBy } = await generateSections(input.industry, input.business);
  const base = slugify(input.business.name, 40);
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${randomBytes(2).toString("hex")}`;
    try {
      const row = await withTenant(user, sub.id, async (tx, ctx) => {
        const [w] = await tx
          .insert(websites)
          .values({
            subAccountId: ctx.subAccount.id,
            slug,
            name: input.business.name,
            template: input.industry,
            theme: { preset: input.style, accent: ctx.subAccount.brandColor },
            business: input.business,
            sections,
            features: input.features,
            generatedBy,
            published: false,
          })
          .returning({ id: websites.id, slug: websites.slug, generatedBy: websites.generatedBy });
        await audit(tx, {
          agencyId: user.agencyId,
          subAccountId: ctx.subAccount.id,
          actor: user.email,
          actorUserId: user.id,
          action: "website.generated",
          entity: "website",
          entityId: w.id,
          ip,
          metadata: { slug, style: input.style, generatedBy },
        });
        return w;
      });
      return { ...row, subSlug: sub.slug };
    } catch (err) {
      if ((err as { code?: string }).code !== "23505") throw err;
    }
  }
  throw new ServiceError("Could not reserve a site address. Try a different business name.", 409);
}

export async function setWebsitePublished(user: CurrentUser, subId: string, websiteId: string, publish: boolean, ip: string) {
  return withTenant(user, subId, async (tx, ctx) => {
    const [row] = await tx
      .update(websites)
      .set({ published: publish, updatedAt: new Date() })
      .where(and(eq(websites.id, websiteId), eq(websites.subAccountId, ctx.subAccount.id)))
      .returning({ id: websites.id, slug: websites.slug, published: websites.published });
    if (!row) throw new ServiceError("Website not found", 404);
    await audit(tx, {
      agencyId: user.agencyId,
      subAccountId: ctx.subAccount.id,
      actor: user.email,
      actorUserId: user.id,
      action: publish ? "website.published" : "website.unpublished",
      entity: "website",
      entityId: websiteId,
      ip,
    });
    return row;
  });
}
