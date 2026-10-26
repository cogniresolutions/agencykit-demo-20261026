"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { contacts, deals, pipelineStages } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { clientIp } from "@/lib/request";
import { withTenant } from "@/lib/tenant";
import { fieldErrors, uuidSchema, type FormState } from "@/lib/validation";

const moveSchema = z.object({ subId: uuidSchema, dealId: uuidSchema, stageId: uuidSchema });

export async function moveDealAction(input: { subId: string; dealId: string; stageId: string }) {
  const user = await requireUser();
  const d = moveSchema.parse(input);
  const ip = await clientIp();
  await withTenant(user, d.subId, async (tx, ctx) => {
    const [stage] = await tx
      .select()
      .from(pipelineStages)
      .where(and(eq(pipelineStages.id, d.stageId), eq(pipelineStages.subAccountId, ctx.subAccount.id)))
      .limit(1);
    if (!stage) throw new Error("Unknown stage");
    const [deal] = await tx
      .update(deals)
      .set({ stageId: stage.id, updatedAt: new Date() })
      .where(and(eq(deals.id, d.dealId), eq(deals.subAccountId, ctx.subAccount.id)))
      .returning();
    if (!deal) throw new Error("Unknown deal");
    if (stage.isWon && deal.contactId) {
      await tx.update(contacts).set({ stage: "customer" }).where(eq(contacts.id, deal.contactId));
    }
    await audit(tx, {
      agencyId: user.agencyId,
      subAccountId: ctx.subAccount.id,
      actor: user.email,
      actorUserId: user.id,
      action: "deal.moved",
      entity: "deal",
      entityId: deal.id,
      ip,
      metadata: { stage: stage.name },
    });
  });
  revalidatePath(`/app`, "layout");
  return { ok: true };
}

const dealSchema = z.object({
  subId: uuidSchema,
  title: z.string().trim().min(1, "Title is required").max(120),
  value: z.coerce.number().min(0, "Must be positive").max(100_000_000),
  stageId: uuidSchema,
  contactId: z.union([z.literal(""), uuidSchema]),
});

export async function addDealAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = dealSchema.safeParse({
    subId: formData.get("subId"),
    title: formData.get("title"),
    value: formData.get("value") || 0,
    stageId: formData.get("stageId"),
    contactId: formData.get("contactId") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const ip = await clientIp();
  await withTenant(user, d.subId, async (tx, ctx) => {
    const [stage] = await tx
      .select({ id: pipelineStages.id })
      .from(pipelineStages)
      .where(and(eq(pipelineStages.id, d.stageId), eq(pipelineStages.subAccountId, ctx.subAccount.id)));
    if (!stage) throw new Error("Unknown stage");
    if (d.contactId) {
      const [c] = await tx.select({ id: contacts.id }).from(contacts).where(and(eq(contacts.id, d.contactId), eq(contacts.subAccountId, ctx.subAccount.id)));
      if (!c) throw new Error("Unknown contact");
    }
    const [deal] = await tx
      .insert(deals)
      .values({
        subAccountId: ctx.subAccount.id,
        stageId: stage.id,
        contactId: d.contactId || null,
        title: d.title,
        valueCents: Math.round(d.value * 100),
      })
      .returning({ id: deals.id });
    await audit(tx, {
      agencyId: user.agencyId,
      subAccountId: ctx.subAccount.id,
      actor: user.email,
      actorUserId: user.id,
      action: "deal.created",
      entity: "deal",
      entityId: deal.id,
      ip,
    });
  });
  revalidatePath(`/app`, "layout");
  return { ok: true, message: "Deal added" };
}
