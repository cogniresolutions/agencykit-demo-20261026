import { asc, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { AddDeal, PipelineBoard } from "@/components/pipeline-board";
import { PageHeader } from "@/components/ui";
import { contacts, deals, pipelineStages } from "@/db/schema";
import { money } from "@/lib/format";
import { tenantPage } from "@/lib/page-tenant";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage({ params }: { params: Promise<{ sub: string }> }) {
  const { sub } = await params;
  const data = await tenantPage(sub, async (tx, ctx) => {
    const id = ctx.subAccount.id;
    const [stages, rows, people] = await Promise.all([
      tx.select().from(pipelineStages).where(eq(pipelineStages.subAccountId, id)).orderBy(asc(pipelineStages.position)),
      tx
        .select({ deal: deals, contactName: contacts.name })
        .from(deals)
        .leftJoin(contacts, eq(contacts.id, deals.contactId))
        .where(eq(deals.subAccountId, id))
        .orderBy(desc(deals.updatedAt)),
      tx.select({ id: contacts.id, name: contacts.name }).from(contacts).where(eq(contacts.subAccountId, id)).orderBy(desc(contacts.createdAt)).limit(300),
    ]);
    return { stages, rows, people, subAccount: ctx.subAccount };
  });

  const wonIds = new Set(data.stages.filter((s) => s.isWon).map((s) => s.id));
  const open = data.rows.filter((r) => !wonIds.has(r.deal.stageId)).reduce((a, r) => a + r.deal.valueCents, 0);
  const won = data.rows.filter((r) => wonIds.has(r.deal.stageId)).reduce((a, r) => a + r.deal.valueCents, 0);
  const stages = data.stages.map((s) => ({ id: s.id, name: s.name, isWon: s.isWon }));

  return (
    <div className="px-10 py-10">
      <PageHeader
        eyebrow={data.subAccount.name}
        title="Pipeline"
        description={`${money(open)} open across ${data.rows.length - [...data.rows].filter((r) => wonIds.has(r.deal.stageId)).length} deals · ${money(won)} won. Drag cards between stages.`}
        actions={<AddDeal subId={data.subAccount.id} stages={stages} contacts={data.people} />}
      />
      <PipelineBoard
        subId={data.subAccount.id}
        stages={stages}
        deals={data.rows.map((r) => ({
          id: r.deal.id,
          title: r.deal.title,
          valueCents: r.deal.valueCents,
          stageId: r.deal.stageId,
          contactName: r.contactName,
          updatedAt: r.deal.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
