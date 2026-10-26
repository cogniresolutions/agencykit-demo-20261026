"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { contacts } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";
import { clientIp } from "@/lib/request";
import { withTenant } from "@/lib/tenant";
import { fieldErrors, uuidSchema, type FormState } from "@/lib/validation";

const stageEnum = z.enum(["new", "contacted", "qualified", "customer", "lost"]);
const tagsSchema = z
  .string()
  .max(300)
  .transform((s) =>
    Array.from(new Set(s.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))).slice(0, 10).map((t) => t.slice(0, 30)),
  );

const contactSchema = z.object({
  subId: uuidSchema,
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.union([z.literal(""), z.email("Enter a valid email").max(254)]),
  phone: z.string().trim().max(40).regex(/^[0-9+().\-\s]*$/, "Digits and + ( ) - only"),
  source: z.string().trim().min(1).max(40),
  stage: stageEnum,
  tags: tagsSchema,
});

export async function addContactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = contactSchema.safeParse({
    subId: formData.get("subId"),
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    phone: formData.get("phone") ?? "",
    source: formData.get("source") || "manual",
    stage: formData.get("stage") || "new",
    tags: formData.get("tags") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const ip = await clientIp();
  await withTenant(user, d.subId, async (tx, ctx) => {
    const [row] = await tx
      .insert(contacts)
      .values({
        subAccountId: ctx.subAccount.id,
        name: d.name,
        email: d.email || null,
        phone: d.phone || null,
        source: d.source,
        stage: d.stage,
        tags: d.tags,
      })
      .returning({ id: contacts.id });
    await audit(tx, {
      agencyId: user.agencyId,
      subAccountId: ctx.subAccount.id,
      actor: user.email,
      actorUserId: user.id,
      action: "contact.created",
      entity: "contact",
      entityId: row.id,
      ip,
    });
  });
  revalidatePath(`/app`, "layout");
  return { ok: true, message: "Contact added" };
}

const importSchema = z.object({ subId: uuidSchema, csv: z.string().min(1, "The file is empty").max(1_000_000, "Max 1 MB") });

export async function importContactsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = importSchema.safeParse({ subId: formData.get("subId"), csv: formData.get("csv") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid file" };
  const rows = parseCsv(parsed.data.csv, 5000);
  if (rows.length < 2) return { error: "Add a header row and at least one contact." };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (names: string[]) => header.findIndex((h) => names.includes(h));
  const iName = col(["name", "full name", "full_name"]);
  const iEmail = col(["email", "email address"]);
  const iPhone = col(["phone", "phone number", "mobile"]);
  const iSource = col(["source"]);
  const iTags = col(["tags", "tag"]);
  if (iName === -1 && iEmail === -1) return { error: "The CSV needs a 'name' or 'email' column." };

  const rowSchema = z.object({
    name: z.string().trim().min(1).max(120),
    email: z.union([z.literal(""), z.email().max(254)]),
    phone: z.string().trim().max(40).regex(/^[0-9+().\-\s]*$/),
    source: z.string().trim().min(1).max(40),
    tags: tagsSchema,
  });

  const valid: z.infer<typeof rowSchema>[] = [];
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const email = (iEmail >= 0 ? r[iEmail] ?? "" : "").trim().toLowerCase();
    const name = (iName >= 0 ? r[iName] ?? "" : "").trim() || email.split("@")[0] || "";
    const res = rowSchema.safeParse({
      name,
      email,
      phone: iPhone >= 0 ? r[iPhone] ?? "" : "",
      source: (iSource >= 0 ? r[iSource] : "") || "csv import",
      tags: [iTags >= 0 ? r[iTags] ?? "" : "", "imported"].filter(Boolean).join(",").replace(/;/g, ","),
    });
    if (res.success) valid.push(res.data);
    else skipped++;
  }
  if (!valid.length) return { error: "No valid rows found. Check the email and phone formats." };

  const ip = await clientIp();
  const inserted = await withTenant(user, parsed.data.subId, async (tx, ctx) => {
    const emails = valid.map((v) => v.email).filter(Boolean);
    const existing = emails.length
      ? new Set(
          (
            await tx
              .select({ email: contacts.email })
              .from(contacts)
              .where(and(eq(contacts.subAccountId, ctx.subAccount.id), inArray(contacts.email, emails)))
          ).map((e) => e.email),
        )
      : new Set<string | null>();
    const seen = new Set<string>();
    const fresh = valid.filter((v) => {
      if (!v.email) return true;
      if (existing.has(v.email) || seen.has(v.email)) return false;
      seen.add(v.email);
      return true;
    });
    for (let i = 0; i < fresh.length; i += 500) {
      await tx.insert(contacts).values(
        fresh.slice(i, i + 500).map((v) => ({
          subAccountId: ctx.subAccount.id,
          name: v.name,
          email: v.email || null,
          phone: v.phone || null,
          source: v.source,
          tags: v.tags,
        })),
      );
    }
    await audit(tx, {
      agencyId: user.agencyId,
      subAccountId: ctx.subAccount.id,
      actor: user.email,
      actorUserId: user.id,
      action: "contact.imported",
      entity: "contact",
      ip,
      metadata: { inserted: fresh.length, duplicates: valid.length - fresh.length, invalid: skipped },
    });
    return { count: fresh.length, duplicates: valid.length - fresh.length };
  });
  revalidatePath(`/app`, "layout");
  return {
    ok: true,
    message: `Imported ${inserted.count} contact(s). ${inserted.duplicates} duplicate(s) and ${skipped} invalid row(s) skipped.`,
  };
}

export async function deleteContactAction(formData: FormData) {
  const user = await requireUser();
  const subId = uuidSchema.parse(formData.get("subId"));
  const contactId = uuidSchema.parse(formData.get("contactId"));
  const ip = await clientIp();
  await withTenant(user, subId, async (tx, ctx) => {
    if (ctx.role !== "admin") return;
    await tx.delete(contacts).where(and(eq(contacts.id, contactId), eq(contacts.subAccountId, ctx.subAccount.id)));
    await audit(tx, {
      agencyId: user.agencyId,
      subAccountId: ctx.subAccount.id,
      actor: user.email,
      actorUserId: user.id,
      action: "contact.deleted",
      entity: "contact",
      entityId: contactId,
      ip,
    });
  });
  revalidatePath(`/app`, "layout");
}
