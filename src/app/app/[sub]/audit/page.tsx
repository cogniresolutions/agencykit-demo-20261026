import { desc, eq } from "drizzle-orm";
import { ScrollText } from "lucide-react";
import type { Metadata } from "next";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { auditLog } from "@/db/schema";
import { dateTime } from "@/lib/format";
import { tenantPage } from "@/lib/page-tenant";

export const metadata: Metadata = { title: "Audit log" };

function tone(action: string) {
  if (action.includes("deleted") || action.includes("failed") || action.includes("removed")) return "danger" as const;
  if (action.startsWith("form.") || action.startsWith("chat.")) return "accent" as const;
  if (action.includes("published") || action.includes("created")) return "success" as const;
  return "neutral" as const;
}

export default async function AuditPage({ params }: { params: Promise<{ sub: string }> }) {
  const { sub } = await params;
  const { rows, subAccount } = await tenantPage(sub, async (tx, ctx) => ({
    rows: await tx.select().from(auditLog).where(eq(auditLog.subAccountId, ctx.subAccount.id)).orderBy(desc(auditLog.createdAt)).limit(300),
    subAccount: ctx.subAccount,
  }));
  return (
    <div className="mx-auto max-w-[1280px] px-10 py-10">
      <PageHeader eyebrow={subAccount.name} title="Audit log" description="An append-only record of who did what, when and from where. Latest 300 events." />
      {rows.length === 0 ? (
        <EmptyState icon={<ScrollText size={20} />} title="No events yet" body="Changes in this sub-account will be recorded here." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-ink-400">
                <th className="px-5 py-3 font-medium">When</th>
                <th className="px-5 py-3 font-medium">Actor</th>
                <th className="px-5 py-3 font-medium">Action</th>
                <th className="px-5 py-3 font-medium">Entity</th>
                <th className="px-5 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-ink-300">{dateTime(r.createdAt)}</td>
                  <td className="px-5 py-3 text-ink-200">{r.actor}</td>
                  <td className="px-5 py-3">
                    <Badge tone={tone(r.action)}>
                      <span className="font-mono">{r.action}</span>
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-xs text-ink-400">
                    {r.entity}
                    {r.entityId ? <span className="ml-1 font-mono text-ink-500">{r.entityId.slice(0, 8)}</span> : null}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-ink-400">{r.ip ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
