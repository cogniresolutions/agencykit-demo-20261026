import { and, eq } from "drizzle-orm";
import { ArrowLeft, Bot, ExternalLink, FileText, Globe2, LayoutTemplate, MessageCircle, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteRenderer } from "@/components/site/site-renderer";
import { Badge, Button, Card, buttonClass } from "@/components/ui";
import { websites } from "@/db/schema";
import { tenantPage } from "@/lib/page-tenant";
import { toSiteRecord } from "@/lib/sites/load";
import { STYLE_PRESETS, industryLabel } from "@/lib/sites/schema";
import { uuidSchema } from "@/lib/validation";
import { deleteWebsiteAction, togglePublishAction } from "../actions";

export const metadata: Metadata = { title: "Website" };

export default async function WebsiteDetailPage({ params, searchParams }: { params: Promise<{ sub: string; id: string }>; searchParams: Promise<{ generated?: string }> }) {
  const { sub, id } = await params;
  const { generated } = await searchParams;
  if (!uuidSchema.safeParse(id).success) notFound();
  const data = await tenantPage(sub, async (tx, ctx) => {
    const [w] = await tx.select().from(websites).where(and(eq(websites.id, id), eq(websites.subAccountId, ctx.subAccount.id))).limit(1);
    return { w, subAccount: ctx.subAccount, role: ctx.role };
  });
  if (!data.w) notFound();
  const site = toSiteRecord(data.w);
  const { subAccount } = data;
  const liveUrl = `/s/${site.slug}`;

  return (
    <div className="px-10 py-10">
      <Link href={`/app/${subAccount.slug}/websites`} className="mb-6 inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-white">
        <ArrowLeft size={14} /> All websites
      </Link>
      {generated ? (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-success/25 bg-success/10 px-5 py-3 text-sm text-success animate-fade-up">
          <Globe2 size={16} />
          Website generated {site.generatedBy === "claude" ? "by Claude" : "from the industry template"}. Review it below, then publish to go live.
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/[0.06] bg-ink-850 px-4 py-3">
              <span className="flex gap-1.5">
                <span className="size-3 rounded-full bg-[#ff5f57]" />
                <span className="size-3 rounded-full bg-[#febc2e]" />
                <span className="size-3 rounded-full bg-[#28c840]" />
              </span>
              <span className="flex-1 truncate rounded-lg bg-white/[0.05] px-3 py-1 text-xs text-ink-300">{(process.env.APP_URL ?? "http://localhost:3000").replace(/^https?:\/\//, "")}{liveUrl}</span>
            </div>
            <div className="scrollbar-thin relative max-h-[calc(100vh-200px)] overflow-y-auto">
              <SiteRenderer site={site} preview />
            </div>
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h1 className="truncate text-base font-semibold text-white">{site.name}</h1>
              {site.published ? <Badge tone="success">Live</Badge> : <Badge tone="warning">Draft</Badge>}
            </div>
            <p className="mt-1 text-xs text-ink-400">{liveUrl}</p>
            <form action={togglePublishAction} className="mt-5">
              <input type="hidden" name="subId" value={subAccount.id} />
              <input type="hidden" name="websiteId" value={site.id} />
              <input type="hidden" name="publish" value={site.published ? "false" : "true"} />
              <Button type="submit" variant={site.published ? "secondary" : "primary"} className="w-full">
                {site.published ? "Unpublish" : "Publish website"}
              </Button>
            </form>
            {site.published ? (
              <a href={liveUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "mt-2 w-full")}>
                <ExternalLink size={15} /> Open live site
              </a>
            ) : null}
          </Card>
          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">Details</h2>
            <ul className="mt-4 grid gap-3 text-sm">
              <li className="flex items-center gap-3 text-ink-200">
                <LayoutTemplate size={15} className="text-ink-400" /> {industryLabel(site.template)} · {STYLE_PRESETS.find((p) => p.value === site.theme.preset)?.label}
              </li>
              <li className="flex items-center gap-3 text-ink-200">
                <Bot size={15} className="text-ink-400" /> {site.generatedBy === "claude" ? "Copy written by Claude" : "Built-in industry template"}
              </li>
              <li className="flex items-center gap-3 text-ink-200">
                <FileText size={15} className="text-ink-400" /> Contact form {site.features.contactForm ? "on" : "off"}
              </li>
              <li className="flex items-center gap-3 text-ink-200">
                <MessageCircle size={15} className="text-ink-400" /> AI chat widget {site.features.chatWidget ? "on" : "off"}
              </li>
            </ul>
          </Card>
          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">SEO</h2>
            <p className="mt-3 text-sm font-medium text-white">{site.sections.seo.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-400">{site.sections.seo.description}</p>
            <p className="mt-3 text-[11px] text-ink-500">Open Graph, Twitter card, canonical URL and LocalBusiness JSON-LD are generated automatically.</p>
          </Card>
          {data.role === "admin" ? (
            <form action={deleteWebsiteAction}>
              <input type="hidden" name="subId" value={subAccount.id} />
              <input type="hidden" name="websiteId" value={site.id} />
              <Button type="submit" variant="danger" className="w-full">
                <Trash2 size={15} /> Delete website
              </Button>
            </form>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
