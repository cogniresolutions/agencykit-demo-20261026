"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { conversations, messages } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { clientIp } from "@/lib/request";
import { withTenant } from "@/lib/tenant";
import { uuidSchema, type FormState } from "@/lib/validation";

const replySchema = z.object({
  subId: uuidSchema,
  conversationId: uuidSchema,
  body: z.string().trim().min(1, "Write a message").max(4000),
});

export async function replyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = replySchema.safeParse({
    subId: formData.get("subId"),
    conversationId: formData.get("conversationId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const ip = await clientIp();
  await withTenant(user, d.subId, async (tx, ctx) => {
    const [convo] = await tx
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, d.conversationId), eq(conversations.subAccountId, ctx.subAccount.id)))
      .limit(1);
    if (!convo) throw new Error("Conversation not found");
    const now = new Date();
    await tx.insert(messages).values({
      subAccountId: ctx.subAccount.id,
      conversationId: convo.id,
      direction: "outbound",
      author: "team",
      body: d.body,
      createdAt: now,
    });
    await tx
      .update(conversations)
      .set({
        lastMessageAt: now,
        unread: false,
        firstResponseSeconds: convo.firstResponseSeconds ?? Math.max(1, Math.round((now.getTime() - convo.createdAt.getTime()) / 1000)),
      })
      .where(eq(conversations.id, convo.id));
    await audit(tx, {
      agencyId: user.agencyId,
      subAccountId: ctx.subAccount.id,
      actor: user.email,
      actorUserId: user.id,
      action: "conversation.replied",
      entity: "conversation",
      entityId: convo.id,
      ip,
    });
  });
  revalidatePath(`/app`, "layout");
  return { ok: true };
}

export async function toggleConversationStatusAction(formData: FormData) {
  const user = await requireUser();
  const subId = uuidSchema.parse(formData.get("subId"));
  const conversationId = uuidSchema.parse(formData.get("conversationId"));
  const status = z.enum(["open", "closed"]).parse(formData.get("status"));
  await withTenant(user, subId, async (tx, ctx) => {
    await tx
      .update(conversations)
      .set({ status })
      .where(and(eq(conversations.id, conversationId), eq(conversations.subAccountId, ctx.subAccount.id)));
  });
  revalidatePath(`/app`, "layout");
}
