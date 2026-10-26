import { z } from "zod";
import { conversations, messages } from "@/db/schema";
import { audit } from "@/lib/audit";
import { upsertLead } from "@/lib/leads";
import { json, readJsonBody, sameOriginOrNoOrigin } from "@/lib/public-api";
import { formLimiter } from "@/lib/rate-limit";
import { ipFromHeaders } from "@/lib/request";
import { loadSiteInTenant, resolveSiteTenant } from "@/lib/sites/load";
import { withPublicTenant } from "@/lib/tenant";

const schema = z.object({
  site: z.string().regex(/^[a-z0-9-]{1,60}$/),
  formName: z.string().trim().min(1).max(60).default("Contact form"),
  name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z.email("Please enter a valid email").max(254),
  phone: z
    .string()
    .trim()
    .max(40)
    .regex(/^[0-9+().\-\s]*$/, "Please enter a valid phone number")
    .optional()
    .default(""),
  message: z.string().trim().max(2000).optional().default(""),
  // Honeypot: must stay empty.
  website: z.string().max(200).optional().default(""),
});

export async function POST(req: Request) {
  if (!sameOriginOrNoOrigin(req)) return json({ error: "Forbidden" }, 403);
  const ip = ipFromHeaders(req.headers);
  const body = await readJsonBody(req);
  if (!body) return json({ error: "Invalid request" }, 400);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400);
  const d = parsed.data;

  const limit = formLimiter.take(`${ip}|${d.site}`);
  if (!limit.ok) return json({ error: "Too many submissions. Please try again later." }, 429, { "Retry-After": String(limit.retryAfterSeconds) });

  // Bots fill the hidden field: pretend success, store nothing.
  if (d.website) return json({ ok: true });

  const ref = await resolveSiteTenant(d.site);
  if (!ref) return json({ error: "Site not found" }, 404);

  const result = await withPublicTenant(ref.subAccountId, async (tx, sub) => {
    const site = await loadSiteInTenant(tx, sub.id, ref.websiteId);
    if (!site || !site.features.contactForm) return null;
    const lead = await upsertLead(tx, sub.id, {
      name: d.name,
      email: d.email.toLowerCase(),
      phone: d.phone,
      source: "website form",
      tag: d.formName.toLowerCase(),
    });
    const [convo] = await tx
      .insert(conversations)
      .values({ subAccountId: sub.id, contactId: lead.id, channel: "form", subject: `${d.formName} · ${site.name}`, unread: true })
      .returning({ id: conversations.id });
    const lines = [`New ${d.formName.toLowerCase()} submission from ${site.name}`, "", `Name: ${d.name}`, `Email: ${d.email}`];
    if (d.phone) lines.push(`Phone: ${d.phone}`);
    if (d.message) lines.push("", d.message);
    await tx.insert(messages).values({
      subAccountId: sub.id,
      conversationId: convo.id,
      direction: "inbound",
      author: "contact",
      body: lines.join("\n"),
    });
    await audit(tx, {
      agencyId: sub.agencyId,
      subAccountId: sub.id,
      actor: "public website",
      action: "form.submitted",
      entity: "contact",
      entityId: lead.id,
      ip,
      metadata: { site: site.slug, form: d.formName, newContact: lead.created },
    });
    return { contactId: lead.id };
  });

  if (!result) return json({ error: "This form is not accepting submissions" }, 404);
  return json({ ok: true });
}
