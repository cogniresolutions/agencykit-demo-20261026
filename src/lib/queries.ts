import "server-only";
import { and, asc, count, eq, gte, lt, sql, sum } from "drizzle-orm";
import { contacts, conversations, deals, pipelineStages, websites } from "@/db/schema";
import type { Tx } from "@/lib/db";

const DAY = 86_400_000;

export async function subAccountSummary(tx: Tx, subId: string) {
  const since = new Date(Date.now() - 30 * DAY);
  const [[leads], [pipeline], [openConvos], [sites]] = await Promise.all([
    tx
      .select({ n: count() })
      .from(contacts)
      .where(and(eq(contacts.subAccountId, subId), gte(contacts.createdAt, since))),
    tx
      .select({ total: sum(deals.valueCents) })
      .from(deals)
      .innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
      .where(and(eq(deals.subAccountId, subId), eq(pipelineStages.isWon, false))),
    tx
      .select({ n: count() })
      .from(conversations)
      .where(and(eq(conversations.subAccountId, subId), eq(conversations.status, "open"))),
    tx
      .select({ n: count(), live: sql<number>`count(*) filter (where ${websites.published})`.mapWith(Number) })
      .from(websites)
      .where(eq(websites.subAccountId, subId)),
  ]);
  return {
    leads30d: leads?.n ?? 0,
    pipelineCents: Number(pipeline?.total ?? 0),
    openConversations: openConvos?.n ?? 0,
    websites: sites?.n ?? 0,
    liveWebsites: sites?.live ?? 0,
  };
}

export async function dashboardMetrics(tx: Tx, subId: string) {
  const now = Date.now();
  const since = new Date(now - 30 * DAY);
  const prevSince = new Date(now - 60 * DAY);

  const [
    [cur],
    [prev],
    [totals],
    [response],
    perDay,
    bySource,
    byStage,
    byChannel,
  ] = await Promise.all([
    tx.select({ n: count() }).from(contacts).where(and(eq(contacts.subAccountId, subId), gte(contacts.createdAt, since))),
    tx
      .select({ n: count() })
      .from(contacts)
      .where(and(eq(contacts.subAccountId, subId), gte(contacts.createdAt, prevSince), lt(contacts.createdAt, since))),
    tx
      .select({
        all: count(),
        customers: sql<number>`count(*) filter (where ${contacts.stage} = 'customer')`.mapWith(Number),
      })
      .from(contacts)
      .where(eq(contacts.subAccountId, subId)),
    tx
      .select({ avg: sql<number | null>`avg(${conversations.firstResponseSeconds})`.mapWith((v) => (v == null ? null : Number(v))) })
      .from(conversations)
      .where(and(eq(conversations.subAccountId, subId), gte(conversations.createdAt, since))),
    tx.execute<{ day: string; leads: number }>(sql`
      select to_char(d.day, 'YYYY-MM-DD') as day, coalesce(count(c.id), 0)::int as leads
      from generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') as d(day)
      left join contacts c
        on c.sub_account_id = ${subId}
       and c.created_at >= d.day and c.created_at < d.day + interval '1 day'
      group by d.day
      order by d.day`),
    tx
      .select({ source: contacts.source, n: count() })
      .from(contacts)
      .where(eq(contacts.subAccountId, subId))
      .groupBy(contacts.source)
      .orderBy(sql`count(*) desc`),
    tx
      .select({
        stage: pipelineStages.name,
        position: pipelineStages.position,
        isWon: pipelineStages.isWon,
        total: sql<number>`coalesce(sum(${deals.valueCents}), 0)`.mapWith(Number),
        deals: sql<number>`count(${deals.id})`.mapWith(Number),
      })
      .from(pipelineStages)
      .leftJoin(deals, eq(deals.stageId, pipelineStages.id))
      .where(eq(pipelineStages.subAccountId, subId))
      .groupBy(pipelineStages.id, pipelineStages.name, pipelineStages.position, pipelineStages.isWon)
      .orderBy(asc(pipelineStages.position)),
    tx
      .select({ channel: conversations.channel, n: count() })
      .from(conversations)
      .where(eq(conversations.subAccountId, subId))
      .groupBy(conversations.channel),
  ]);

  const openPipeline = byStage.filter((s) => !s.isWon).reduce((a, s) => a + s.total, 0);
  return {
    newLeads: cur?.n ?? 0,
    prevLeads: prev?.n ?? 0,
    pipelineCents: openPipeline,
    conversionRate: totals && totals.all > 0 ? totals.customers / totals.all : 0,
    customers: totals?.customers ?? 0,
    totalContacts: totals?.all ?? 0,
    avgResponseSeconds: response?.avg ?? null,
    perDay: [...perDay].map((r) => ({ day: r.day, leads: Number(r.leads) })),
    bySource: bySource.map((r) => ({ source: r.source, count: r.n })),
    byStage: byStage.map((r) => ({ stage: r.stage, value: r.total / 100, deals: r.deals })),
    byChannel: byChannel.map((r) => ({ channel: r.channel, count: r.n })),
  };
}
