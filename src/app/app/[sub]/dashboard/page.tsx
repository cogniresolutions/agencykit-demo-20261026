import { ArrowDownRight, ArrowUpRight, Clock3, Percent, Users, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { DashboardCharts } from "@/components/dashboard-charts";
import { Card, PageHeader } from "@/components/ui";
import { duration, money, percent } from "@/lib/format";
import { tenantPage } from "@/lib/page-tenant";
import { dashboardMetrics } from "@/lib/queries";
import { industryLabel } from "@/lib/sites/schema";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ params }: { params: Promise<{ sub: string }> }) {
  const { sub } = await params;
  const { m, subAccount } = await tenantPage(sub, async (tx, ctx) => ({
    m: await dashboardMetrics(tx, ctx.subAccount.id),
    subAccount: ctx.subAccount,
  }));

  const delta = m.prevLeads === 0 ? null : (m.newLeads - m.prevLeads) / m.prevLeads;
  const kpis = [
    {
      label: "New leads",
      sub: "Last 30 days",
      value: m.newLeads.toLocaleString(),
      icon: Users,
      delta,
    },
    { label: "Pipeline value", sub: "Open deals", value: money(m.pipelineCents), icon: Wallet, delta: null },
    {
      label: "Conversion rate",
      sub: `${m.customers} of ${m.totalContacts} contacts are customers`,
      value: percent(m.conversionRate),
      icon: Percent,
      delta: null,
    },
    { label: "Avg. response time", sub: "First reply, last 30 days", value: duration(m.avgResponseSeconds), icon: Clock3, delta: null },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-10 py-10">
      <PageHeader eyebrow={industryLabel(subAccount.industry)} title={subAccount.name} description="Lead flow, pipeline and response performance at a glance." />
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <Card key={k.label} className="relative overflow-hidden p-5 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            {i === 0 ? <div className="accent-glow pointer-events-none absolute inset-0 opacity-60" /> : null}
            <div className="relative flex items-center justify-between">
              <p className="text-xs font-medium text-ink-300">{k.label}</p>
              <span className="grid size-8 place-items-center rounded-lg bg-white/[0.05] text-accent">
                <k.icon size={15} />
              </span>
            </div>
            <p className="relative mt-3 text-[30px] font-semibold tracking-tight text-white">{k.value}</p>
            <div className="relative mt-1 flex items-center gap-2 text-xs text-ink-400">
              {k.delta != null ? (
                <span className={k.delta >= 0 ? "inline-flex items-center text-success" : "inline-flex items-center text-danger"}>
                  {k.delta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {Math.abs(k.delta * 100).toFixed(0)}%
                </span>
              ) : null}
              <span className="truncate">{k.delta != null ? "vs previous 30 days" : k.sub}</span>
            </div>
          </Card>
        ))}
      </div>
      <DashboardCharts accent={subAccount.brandColor} perDay={m.perDay} bySource={m.bySource} byStage={m.byStage} byChannel={m.byChannel} />
    </div>
  );
}
