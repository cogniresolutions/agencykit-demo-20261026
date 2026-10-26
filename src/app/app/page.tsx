import { ArrowUpRight, Building2, Globe2, MessagesSquare, Users, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CreateSubAccountButton } from "@/components/create-sub-account";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { isAgencyAdmin, requireUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { subAccountSummary } from "@/lib/queries";
import { industryLabel } from "@/lib/sites/schema";
import { listAccessibleSubAccounts, withTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Agency home" };

export default async function AgencyHome({ searchParams }: { searchParams: Promise<{ create?: string }> }) {
  const user = await requireUser();
  const { create } = await searchParams;
  const canManage = isAgencyAdmin(user);
  const subs = await listAccessibleSubAccounts(user);
  const summaries = await Promise.all(
    subs.map(async (s) => ({ sub: s, stats: await withTenant(user, s.id, (tx) => subAccountSummary(tx, s.id)) })),
  );
  const totals = summaries.reduce(
    (acc, { stats }) => ({
      leads: acc.leads + stats.leads30d,
      pipeline: acc.pipeline + stats.pipelineCents,
      convos: acc.convos + stats.openConversations,
      sites: acc.sites + stats.liveWebsites,
    }),
    { leads: 0, pipeline: 0, convos: 0, sites: 0 },
  );
  const firstName = user.name.split(" ")[0];

  const kpis = [
    { label: "Sub-accounts", value: String(subs.length), icon: Building2 },
    { label: "New leads (30d)", value: totals.leads.toLocaleString(), icon: Users },
    { label: "Open pipeline", value: money(totals.pipeline), icon: Wallet },
    { label: "Live websites", value: String(totals.sites), icon: Globe2 },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-10 py-10">
      <PageHeader
        eyebrow={user.agencyName}
        title={`Welcome back, ${firstName}`}
        description="Every client lives in its own sub-account with isolated leads, pipeline, conversations and websites."
        actions={canManage ? <CreateSubAccountButton autoOpen={create === "1"} /> : null}
      />

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <Card key={k.label} className="relative overflow-hidden p-5 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-ink-400">{k.label}</p>
              <k.icon size={16} className="text-ink-500" />
            </div>
            <p className="mt-3 text-[28px] font-semibold tracking-tight text-white">{k.value}</p>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Sub-accounts</h2>
        <p className="text-xs text-ink-400">{subs.length} total</p>
      </div>

      {summaries.length === 0 ? (
        <EmptyState
          icon={<Building2 size={20} />}
          title="Create your first sub-account"
          body="Add a client to get a private workspace with leads, a pipeline board, an inbox and an AI-generated website."
          action={canManage ? <CreateSubAccountButton label="Create first sub-account" /> : null}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {summaries.map(({ sub, stats }, i) => (
            <Link
              key={sub.id}
              href={`/app/${sub.slug}/dashboard`}
              className="group animate-fade-up"
              style={{ animationDelay: `${i * 50}ms`, ["--accent" as string]: sub.brandColor }}
            >
              <Card className="relative h-full overflow-hidden p-6 transition duration-200 group-hover:-translate-y-0.5 group-hover:border-white/15">
                <div className="accent-glow pointer-events-none absolute inset-x-0 top-0 h-32 opacity-70" />
                <div className="relative flex items-start gap-3.5">
                  <Avatar name={sub.name} color={sub.brandColor} size={42} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-white">{sub.name}</p>
                    <p className="text-xs text-ink-400">{industryLabel(sub.industry)}</p>
                  </div>
                  <ArrowUpRight size={18} className="text-ink-500 transition group-hover:text-accent" />
                </div>
                <div className="relative mt-6 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-5">
                  <div>
                    <p className="text-[11px] text-ink-400">Leads 30d</p>
                    <p className="mt-0.5 text-lg font-semibold text-white">{stats.leads30d}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-ink-400">Pipeline</p>
                    <p className="mt-0.5 text-lg font-semibold text-white">{money(stats.pipelineCents, { compact: true })}</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-[11px] text-ink-400">
                      <MessagesSquare size={11} /> Open
                    </p>
                    <p className="mt-0.5 text-lg font-semibold text-white">{stats.openConversations}</p>
                  </div>
                </div>
                <div className="relative mt-5">
                  {stats.liveWebsites > 0 ? (
                    <Badge tone="success">
                      <span className="size-1.5 rounded-full bg-success" /> Website live
                    </Badge>
                  ) : stats.websites > 0 ? (
                    <Badge tone="warning">Website draft</Badge>
                  ) : (
                    <Badge>No website yet</Badge>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
