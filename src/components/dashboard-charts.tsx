"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui";

// Categorical palette validated for CVD separation on the dark surface (#0e1015).
const CHANNEL_COLORS: Record<string, string> = {
  web_chat: "#3987e5",
  form: "#d95926",
  email: "#199e70",
  sms: "#c98500",
};
const CHANNEL_LABELS: Record<string, string> = { web_chat: "Web chat", form: "Form", email: "Email", sms: "SMS" };

const axis = { stroke: "#6b7180", fontSize: 11, tickLine: false, axisLine: false } as const;
const grid = { stroke: "rgba(255,255,255,0.06)", vertical: false } as const;

function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: { value?: number | string; name?: string; payload?: Record<string, unknown> }[];
  label?: string | number;
  format?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const value = Number(p.value ?? 0);
  return (
    <div className="rounded-xl border border-white/10 bg-ink-800/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="text-ink-400">{label ?? p.name}</p>
      <p className="mt-0.5 font-semibold text-white">{format ? format(value) : value.toLocaleString()}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`p-5 ${className ?? ""}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle ? <p className="text-xs text-ink-400">{subtitle}</p> : null}
      </div>
      {children}
    </Card>
  );
}

const usd = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
const usdCompact = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(v);

export function DashboardCharts({
  accent,
  perDay,
  bySource,
  byStage,
  byChannel,
}: {
  accent: string;
  perDay: { day: string; leads: number }[];
  bySource: { source: string; count: number }[];
  byStage: { stage: string; value: number; deals: number }[];
  byChannel: { channel: string; count: number }[];
}) {
  const days = perDay.map((d) => ({
    ...d,
    label: new Date(`${d.day}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));
  const channelTotal = byChannel.reduce((a, c) => a + c.count, 0);
  const sources = bySource.slice(0, 6);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ChartCard title="Leads per day" subtitle="Last 30 days" className="lg:col-span-2">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={days} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...grid} />
              <XAxis dataKey="label" {...axis} interval={4} />
              <YAxis {...axis} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.18)", strokeWidth: 1 }} />
              <Area type="monotone" dataKey="leads" name="Leads" stroke={accent} strokeWidth={2} fill="url(#leadsFill)" activeDot={{ r: 4, strokeWidth: 2, stroke: "#0e1015" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Conversations by channel" subtitle="All time">
        {channelTotal === 0 ? (
          <EmptyChart />
        ) : (
          <div className="flex h-64 flex-col">
            <div className="relative min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<ChartTooltip />} />
                  <Pie
                    data={byChannel.map((c) => ({ ...c, name: CHANNEL_LABELS[c.channel] ?? c.channel }))}
                    dataKey="count"
                    nameKey="name"
                    innerRadius="64%"
                    outerRadius="92%"
                    paddingAngle={2}
                    stroke="#0e1015"
                    strokeWidth={2}
                  >
                    {byChannel.map((c) => (
                      <Cell key={c.channel} fill={CHANNEL_COLORS[c.channel] ?? "#6b7180"} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-white">{channelTotal}</p>
                  <p className="text-[11px] text-ink-400">conversations</p>
                </div>
              </div>
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {byChannel.map((c) => (
                <li key={c.channel} className="flex items-center gap-2 text-xs text-ink-300">
                  <span className="size-2.5 rounded-sm" style={{ background: CHANNEL_COLORS[c.channel] ?? "#6b7180" }} />
                  <span className="flex-1">{CHANNEL_LABELS[c.channel] ?? c.channel}</span>
                  <span className="font-medium text-ink-100">{c.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </ChartCard>

      <ChartCard title="Leads by source" subtitle="All contacts">
        {sources.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sources} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }} barCategoryGap={8}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" {...axis} allowDecimals={false} />
                <YAxis type="category" dataKey="source" {...axis} width={112} tick={{ fill: "#9aa0ad", fontSize: 11 }} tickFormatter={(v: string) => v.replace(/\b\w/g, (c) => c.toUpperCase())} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="count" name="Leads" fill={accent} radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard title="Pipeline value by stage" subtitle="Sum of deal values" className="lg:col-span-2">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byStage} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid {...grid} />
              <XAxis dataKey="stage" {...axis} tick={{ fill: "#9aa0ad", fontSize: 11 }} />
              <YAxis {...axis} tickFormatter={usdCompact} width={56} />
              <Tooltip content={<ChartTooltip format={usd} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="value" name="Value" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="grid h-64 place-items-center rounded-xl border border-dashed border-white/10 text-center text-xs text-ink-400">
      <p>
        No data yet.
        <br />
        Leads from your website will show up here.
      </p>
    </div>
  );
}
