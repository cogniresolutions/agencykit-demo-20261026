"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { memberships, subAccounts, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { hashPassword, isAgencyAdmin, requireUser } from "@/lib/auth";
import { clientIp } from "@/lib/request";
import { withTenant } from "@/lib/tenant";
import { emailSchema, fieldErrors, hexColorSchema, nameSchema, uuidSchema, type FormState } from "@/lib/validation";

export async function updateBrandAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = z
    .object({ subId: uuidSchema, name: z.string().trim().min(2).max(80), brandColor: hexColorSchema })
    .safeParse({ subId: formData.get("subId"), name: formData.get("name"), brandColor: formData.get("brandColor") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const ip = await clientIp();
  const res = await withTenant(user, parsed.data.subId, async (tx, ctx) => {
    if (ctx.role !== "admin") return { error: "Only admins can change branding." };
    await tx
      .update(subAccounts)
      .set({ name: parsed.data.name, brandColor: parsed.data.brandColor.toLowerCase() })
      .where(eq(subAccounts.id, ctx.subAccount.id));
    await audit(tx, {
      agencyId: user.agencyId,
      subAccountId: ctx.subAccount.id,
      actor: user.email,
      actorUserId: user.id,
      action: "sub_account.updated",
      entity: "sub_account",
      entityId: ctx.subAccount.id,
      ip,
      metadata: { brandColor: parsed.data.brandColor },
    });
    return { ok: true, message: "Branding saved" };
  });
  revalidatePath("/app", "layout");
  return res;
}

const memberSchema = z.object({
  subId: uuidSchema,
  name: nameSchema,
  email: emailSchema,
  role: z.enum(["admin", "member"]),
});

export async function addMemberAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = memberSchema.safeParse({
    subId: formData.get("subId"),
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (!isAgencyAdmin(user)) return { error: "Only agency owners and admins can add members." };
  const d = parsed.data;
  const ip = await clientIp();
  const tempPassword = randomBytes(12).toString("base64url");
  const passwordHash = await hashPassword(tempPassword);

  try {
    const result = await withTenant(user, d.subId, async (tx, ctx) => {
      const [existing] = await tx.select().from(users).where(eq(users.email, d.email)).limit(1);
      if (existing && existing.agencyId !== user.agencyId) return { error: "This email belongs to another agency." };
      let userId = existing?.id;
      let created = false;
      if (!userId) {
        const [u] = await tx
          .insert(users)
          .values({ agencyId: user.agencyId, email: d.email, name: d.name, passwordHash, role: "member" })
          .returning({ id: users.id });
        userId = u.id;
        created = true;
      }
      await tx
        .insert(memberships)
        .values({ subAccountId: ctx.subAccount.id, userId, role: d.role })
        .onConflictDoUpdate({ target: [memberships.subAccountId, memberships.userId], set: { role: d.role } });
      await audit(tx, {
        agencyId: user.agencyId,
        subAccountId: ctx.subAccount.id,
        actor: user.email,
        actorUserId: user.id,
        action: "member.added",
        entity: "user",
        entityId: userId,
        ip,
        metadata: { email: d.email, role: d.role },
      });
      return created
        ? { ok: true, message: `Member added. Share this one-time password securely: ${tempPassword}` }
        : { ok: true, message: "Existing user added to this sub-account." };
    });
    revalidatePath("/app", "layout");
    return result;
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return { error: "That email is already in use." };
    throw err;
  }
}

export async function removeMemberAction(formData: FormData) {
  const user = await requireUser();
  const subId = uuidSchema.parse(formData.get("subId"));
  const memberUserId = uuidSchema.parse(formData.get("userId"));
  if (!isAgencyAdmin(user)) return;
  const ip = await clientIp();
  await withTenant(user, subId, async (tx, ctx) => {
    await tx.delete(memberships).where(and(eq(memberships.subAccountId, ctx.subAccount.id), eq(memberships.userId, memberUserId)));
    await audit(tx, {
      agencyId: user.agencyId,
      subAccountId: ctx.subAccount.id,
      actor: user.email,
      actorUserId: user.id,
      action: "member.removed",
      entity: "user",
      entityId: memberUserId,
      ip,
    });
  });
  revalidatePath("/app", "layout");
}

export async function rotateWidgetKeyAction(_prev: FormState, formData: FormData): Promise<FormState & { key?: string }> {
  const user = await requireUser();
  const subId = uuidSchema.parse(formData.get("subId"));
  const ip = await clientIp();
  const key = `ak_live_${randomBytes(24).toString("base64url")}`;
  const hash = createHash("sha256").update(key).digest("hex");
  const res = await withTenant(user, subId, async (tx, ctx) => {
    if (ctx.role !== "admin") return { error: "Only admins can manage API keys." };
    await tx
      .update(subAccounts)
      .set({ widgetKeyHash: hash, widgetKeyPrefix: key.slice(0, 14) })
      .where(eq(subAccounts.id, ctx.subAccount.id));
    await audit(tx, {
      agencyId: user.agencyId,
      subAccountId: ctx.subAccount.id,
      actor: user.email,
      actorUserId: user.id,
      action: "widget_key.rotated",
      entity: "sub_account",
      entityId: ctx.subAccount.id,
      ip,
    });
    return { ok: true, key };
  });
  revalidatePath("/app", "layout");
  return res;
}

export async function deleteSubAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const subId = uuidSchema.parse(formData.get("subId"));
  const confirm = String(formData.get("confirm") ?? "");
  if (!isAgencyAdmin(user)) return { error: "Only agency owners and admins can delete sub-accounts." };
  const ip = await clientIp();
  const res = await withTenant(user, subId, async (tx, ctx) => {
    if (confirm !== ctx.subAccount.slug) return { error: `Type ${ctx.subAccount.slug} to confirm.` };
    await tx.delete(subAccounts).where(eq(subAccounts.id, ctx.subAccount.id));
    await audit(tx, {
      agencyId: user.agencyId,
      subAccountId: null,
      actor: user.email,
      actorUserId: user.id,
      action: "sub_account.deleted",
      entity: "sub_account",
      entityId: ctx.subAccount.id,
      ip,
      metadata: { name: ctx.subAccount.name, slug: ctx.subAccount.slug },
    });
    return null;
  });
  if (res) return res;
  revalidatePath("/app", "layout");
  redirect("/app");
}
