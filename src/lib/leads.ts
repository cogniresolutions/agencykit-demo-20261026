import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { contacts } from "@/db/schema";
import type { Tx } from "@/lib/db";

/** Finds a contact by email inside the pinned tenant, or creates one. Adds the tag if missing. */
export async function upsertLead(
  tx: Tx,
  subAccountId: string,
  lead: { name: string; email?: string | null; phone?: string | null; source: string; tag: string },
): Promise<{ id: string; created: boolean }> {
  const email = lead.email?.trim().toLowerCase() || null;
  if (email) {
    const [existing] = await tx
      .select({ id: contacts.id, tags: contacts.tags })
      .from(contacts)
      .where(and(eq(contacts.subAccountId, subAccountId), eq(contacts.email, email)))
      .limit(1);
    if (existing) {
      if (!existing.tags.includes(lead.tag)) {
        await tx
          .update(contacts)
          .set({ tags: sql`array_append(${contacts.tags}, ${lead.tag})` })
          .where(eq(contacts.id, existing.id));
      }
      return { id: existing.id, created: false };
    }
  }
  const [row] = await tx
    .insert(contacts)
    .values({
      subAccountId,
      name: lead.name,
      email,
      phone: lead.phone || null,
      source: lead.source,
      tags: [lead.tag],
      stage: "new",
    })
    .returning({ id: contacts.id });
  return { id: row.id, created: true };
}
