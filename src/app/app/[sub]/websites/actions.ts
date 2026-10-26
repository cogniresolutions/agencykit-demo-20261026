"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { websites } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { clientIp } from "@/lib/request";
import { ServiceError, createWebsite, generateWebsiteSchema, setWebsitePublished } from "@/lib/services";
import { withTenant } from "@/lib/tenant";
import { uuidSchema } from "@/lib/validation";

const generateSchema = generateWebsiteSchema.extend({ subId: uuidSchema });

export type GenerateResult = { error?: string };

export async function generateWebsiteAction(input: z.input<typeof generateSchema>): Promise<GenerateResult> {
  const user = await requireUser();
  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  const { subId, ...rest } = parsed.data;
  let created: { id: string; subSlug: string };
  try {
    created = await createWebsite(user, subId, rest, await clientIp());
  } catch (err) {
    if (err instanceof ServiceError) return { error: err.message };
    throw err;
  }
  revalidatePath("/app", "layout");
  redirect(`/app/${created.subSlug}/websites/${created.id}?generated=1`);
}

export async function togglePublishAction(formData: FormData) {
  const user = await requireUser();
  const subId = uuidSchema.parse(formData.get("subId"));
  const websiteId = uuidSchema.parse(formData.get("websiteId"));
  await setWebsitePublished(user, subId, websiteId, formData.get("publish") === "true", await clientIp());
  revalidatePath("/app", "layout");
}

export async function deleteWebsiteAction(formData: FormData) {
  const user = await requireUser();
  const subId = uuidSchema.parse(formData.get("subId"));
  const websiteId = uuidSchema.parse(formData.get("websiteId"));
  const ip = await clientIp();
  const slug = await withTenant(user, subId, async (tx, ctx) => {
    if (ctx.role !== "admin") return ctx.subAccount.slug;
    await tx.delete(websites).where(and(eq(websites.id, websiteId), eq(websites.subAccountId, ctx.subAccount.id)));
    await audit(tx, {
      agencyId: user.agencyId,
      subAccountId: ctx.subAccount.id,
      actor: user.email,
      actorUserId: user.id,
      action: "website.deleted",
      entity: "website",
      entityId: websiteId,
      ip,
    });
    return ctx.subAccount.slug;
  });
  revalidatePath("/app", "layout");
  redirect(`/app/${slug}/websites`);
}
