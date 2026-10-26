import { Download, Trash2, Users } from "lucide-react";
import type { Metadata } from "next";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { AddContact, ContactSearch, ImportContacts } from "@/components/contacts-client";
import { Avatar, Badge, Card, EmptyState, PageHeader, buttonClass } from "@/components/ui";
import { contacts } from "@/db/schema";
import { STAGE_LABELS, relativeTime } from "@/lib/format";
import { tenantPage } from "@/lib/page-tenant";
import { deleteContactAction } from "./actions";

export const metadata: Metadata = { title: "Contacts" };

const stageTone = { new: "accent", contacted: "neutral", qualified: "warning", customer: "success", lost: "danger" } as const;

export default async function ContactsPage({ params, searchParams }: { params: Promise<{ sub: string }>; searchParams: Promise<{ q?: string }> }) {
  const { sub } = await params;
  const { q: rawQ } = await searchParams;
  const q = typeof rawQ === "string" ? rawQ.trim().slice(0, 100) : "";

  const { rows, total, subAccount, role } = await tenantPage(sub, async (tx, ctx) => {
    const id = ctx.subAccount.id;
    const pattern = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    const filter = q
      ? and(
          eq(contacts.subAccountId, id),
          or(
            ilike(contacts.name, pattern),
            ilike(contacts.email, pattern),
            ilike(contacts.phone, pattern),
            sql`exists (select 1 from unnest(${contacts.tags}) t where t ilike ${pattern})`,
          ),
        )
      : eq(contacts.subAccountId, id);
    const [rows, [count]] = await Promise.all([
      tx.select().from(contacts).where(filter).orderBy(desc(contacts.createdAt)).limit(200),
      tx.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(contacts).where(eq(contacts.subAccountId, id)),
    ]);
    return { rows, total: count?.n ?? 0, subAccount: ctx.subAccount, role: ctx.role };
  });

  return (
    <div className="mx-auto max-w-[1280px] px-10 py-10">
      <PageHeader
        eyebrow={subAccount.name}
        title="Contacts"
        description={`${total.toLocaleString()} leads and customers in this sub-account.`}
        actions={
          <>
            <a href={`/api/sub/${subAccount.id}/contacts/export`} className={buttonClass("secondary")}>
              <Download size={16} /> Export CSV
            </a>
            <ImportContacts subId={subAccount.id} />
            <AddContact subId={subAccount.id} />
          </>
        }
      />
      <div className="mb-4 flex items-center justify-between gap-4">
        <ContactSearch initial={q} />
        <p className="text-xs text-ink-400">{q ? `${rows.length} match${rows.length === 1 ? "" : "es"}` : rows.length < total ? `Showing latest ${rows.length}` : ""}</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title={q ? "No contacts match your search" : "No contacts yet"}
          body={q ? "Try a different name, email or tag." : "Add a contact, import a CSV, or publish a website to start capturing leads automatically."}
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-ink-400">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Tags</th>
                <th className="px-5 py-3 font-medium">Stage</th>
                <th className="px-5 py-3 font-medium">Added</th>
                <th className="w-12 px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="group border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} size={32} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{c.name}</p>
                        <p className="truncate text-xs text-ink-400">{c.email ?? "No email"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink-300">{c.phone ?? <span className="text-ink-500">-</span>}</td>
                  <td className="px-5 py-3 capitalize text-ink-300">{c.source}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.slice(0, 3).map((t) => (
                        <Badge key={t}>{t}</Badge>
                      ))}
                      {c.tags.length > 3 ? <Badge>+{c.tags.length - 3}</Badge> : null}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={stageTone[c.stage]}>{STAGE_LABELS[c.stage]}</Badge>
                  </td>
                  <td className="px-5 py-3 text-xs text-ink-400">{relativeTime(c.createdAt)}</td>
                  <td className="px-5 py-3 text-right">
                    {role === "admin" ? (
                      <form action={deleteContactAction}>
                        <input type="hidden" name="subId" value={subAccount.id} />
                        <input type="hidden" name="contactId" value={c.id} />
                        <button type="submit" className="rounded-lg p-1.5 text-ink-500 opacity-0 transition hover:bg-danger/10 hover:text-danger group-hover:opacity-100" aria-label={`Delete ${c.name}`}>
                          <Trash2 size={15} />
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
