import { createHash } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { conversations, messages, websites } from "@/db/schema";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { upsertLead } from "@/lib/leads";
import { json, readJsonBody, sameOriginOrNoOrigin } from "@/lib/public-api";
import { chatLimiter } from "@/lib/rate-limit";
import { ipFromHeaders } from "@/lib/request";
import { chatReply } from "@/lib/sites/chat";
import { resolveSiteTenant, toSiteRecord } from "@/lib/sites/load";
import { withPublicTenant } from "@/lib/tenant";

const MAX_MESSAGE = 1000;

const schema = z.object({
  site: z.string().regex(/^[a-z0-9-]{1,60}$/).optional(),
  conversationId: z.uuid().nullable().optional(),
  message: z.string().trim().min(1, "Message is empty").max(MAX_MESSAGE, `Max ${MAX_MESSAGE} characters`),
  name: z.string().trim().min(1).max(120).optional(),
  email: z.email().max(254).optional(),
});

function corsHeaders(req: Request): Record<string, string> {
  // Cross-origin calls are allowed only with a widget key (embedding on an external site).
  return req.headers.get("x-widget-key")
    ? {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type, x-widget-key",
      }
    : {};
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, x-widget-key",
      "Access-Control-Max-Age": "600",
    },
  });
}

async function resolveTenant(req: Request, site?: string) {
  const key = req.headers.get("x-widget-key");
  if (key) {
    if (!/^ak_live_[A-Za-z0-9_-]{20,80}$/.test(key)) return null;
    const hash = createHash("sha256").update(key).digest("hex");
    const rows = await db.execute<{ id: string | null }>(sql`select app_resolve_widget_key(${hash}) as id`);
    const subId = rows[0]?.id;
    return subId ? { subAccountId: subId, websiteId: null as string | null } : null;
  }
  if (!site) return null;
  if (!sameOriginOrNoOrigin(req)) return null;
  return resolveSiteTenant(site);
}

export async function POST(req: Request) {
  const cors = corsHeaders(req);
  const ip = ipFromHeaders(req.headers);
  const body = await readJsonBody(req);
  if (!body) return json({ error: "Invalid request" }, 400, cors);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400, cors);
  const d = parsed.data;

  const limit = chatLimiter.take(`${ip}|${d.site ?? "key"}`);
  if (!limit.ok) return json({ error: "You are sending messages too quickly. Please wait a moment." }, 429, { ...cors, "Retry-After": String(limit.retryAfterSeconds) });

  const ref = await resolveTenant(req, d.site);
  if (!ref) return json({ error: "Chat is not available for this site" }, 404, cors);

  // Phase 1: store the visitor message and load context (short transaction).
  const stage1 = await withPublicTenant(ref.subAccountId, async (tx, sub) => {
    const siteRows = ref.websiteId
      ? await tx.select().from(websites).where(and(eq(websites.id, ref.websiteId), eq(websites.subAccountId, sub.id), eq(websites.published, true))).limit(1)
      : await tx.select().from(websites).where(and(eq(websites.subAccountId, sub.id), eq(websites.published, true))).limit(1);
    const site = siteRows[0] ? toSiteRecord(siteRows[0]) : null;
    if (!site || !site.features.chatWidget) return null;

    let convoId = d.conversationId ?? null;
    if (convoId) {
      const [existing] = await tx
        .select({ id: conversations.id })
        .from(conversations)
        .where(and(eq(conversations.id, convoId), eq(conversations.subAccountId, sub.id), eq(conversations.channel, "web_chat")))
        .limit(1);
      if (!existing) convoId = null;
    }
    if (!convoId) {
      const [created] = await tx
        .insert(conversations)
        .values({ subAccountId: sub.id, channel: "web_chat", subject: `Website chat · ${site.name}` })
        .returning({ id: conversations.id });
      convoId = created.id;
    }

    let leadCaptured = false;
    if (d.name && d.email) {
      const lead = await upsertLead(tx, sub.id, { name: d.name, email: d.email, source: "website chat", tag: "chat" });
      await tx.update(conversations).set({ contactId: lead.id }).where(eq(conversations.id, convoId));
      await audit(tx, {
        agencyId: sub.agencyId,
        subAccountId: sub.id,
        actor: "public website",
        action: "chat.lead_captured",
        entity: "contact",
        entityId: lead.id,
        ip,
        metadata: { site: site.slug, newContact: lead.created },
      });
      leadCaptured = true;
    }

    await tx.insert(messages).values({ subAccountId: sub.id, conversationId: convoId, direction: "inbound", author: "contact", body: d.message });
    await tx.update(conversations).set({ lastMessageAt: new Date(), unread: true, status: "open" }).where(eq(conversations.id, convoId));

    const history = await tx
      .select({ direction: messages.direction, body: messages.body })
      .from(messages)
      .where(and(eq(messages.subAccountId, sub.id), eq(messages.conversationId, convoId)))
      .orderBy(asc(messages.createdAt))
      .limit(40);
    return { site, convoId, leadCaptured, history };
  });
  if (!stage1) return json({ error: "Chat is not available for this site" }, 404, cors);

  // Build an alternating user/assistant history that starts with the visitor.
  const turns: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of stage1.history) {
    const role = m.direction === "inbound" ? "user" : "assistant";
    if (!turns.length && role === "assistant") continue;
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += `\n${m.body}`;
    else turns.push({ role, content: m.body });
  }

  // Phase 2: generate the reply outside the transaction, then store it.
  const reply = await chatReply(stage1.site.business, stage1.site.sections, turns);
  await withPublicTenant(ref.subAccountId, async (tx, sub) => {
    const [convo] = await tx.select().from(conversations).where(and(eq(conversations.id, stage1.convoId), eq(conversations.subAccountId, sub.id))).limit(1);
    if (!convo) return;
    const now = new Date();
    await tx.insert(messages).values({ subAccountId: sub.id, conversationId: convo.id, direction: "outbound", author: "ai", body: reply.text, createdAt: now });
    await tx
      .update(conversations)
      .set({
        lastMessageAt: now,
        firstResponseSeconds: convo.firstResponseSeconds ?? Math.max(1, Math.round((now.getTime() - convo.createdAt.getTime()) / 1000)),
      })
      .where(eq(conversations.id, convo.id));
  });

  return json({ conversationId: stage1.convoId, reply: reply.text, ai: reply.ai, leadCaptured: stage1.leadCaptured }, 200, cors);
}
