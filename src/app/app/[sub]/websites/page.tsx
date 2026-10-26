import { desc, eq } from "drizzle-orm";
import { ExternalLink, Globe2, Plus, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { websites } from "@/db/schema";
import { relativeTime } from "@/lib/format";
import { tenantPage } from "@/lib/page-tenant";
import { STYLE_PRESETS, industryLabel, type Theme } from "@/lib/sites/schema";

export const metadata: Metadata = { title: "Websites" };

export default async function WebsitesPage({ params }: { params: Promise<{ sub: string }> }) {
  const { sub } = await params;
  const { rows, subAccount } = await tenantPage(sub, async (tx, ctx) => ({
    rows: await tx.select().from(websites).where(eq(websites.subAccountId, ctx.subAccount.id)).orderBy(desc(websites.createdAt)),
    subAccount: ctx.subAccount,
  }));
  const newHref = `/app/${subAccount.slug}/websites/new`;

  return (
    <div className="mx-auto max-w-[1280px] px-10 py-10">
      <PageHeader
        eyebrow={subAccount.name}
        title="Websites"
        description="Generate a conversion-ready website with a contact form and AI chat widget in under a minute."
        actions={
          <LinkButton href={newHref}>
            <Sparkles size={16} /> Generate website
          </LinkButton>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<Globe2 size={20} />}
          title="No websites yet"
          body="Pick an industry template, add business details and choose a design. Leads from the site flow straight into this sub-account."
          action={
            <LinkButton href={newHref}>
              <Plus size={16} /> Generate your first website
            </LinkButton>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((w) => {
            const theme = w.theme as Theme;
            return (
              <Card key={w.id} className="group overflow-hidden">
                <Link href={`/app/${subAccount.slug}/websites/${w.id}`} className="block">
                  <div
                    className="relative h-40 overflow-hidden border-b border-white/[0.06]"
                    style={{
                      background:
                        theme.preset === "editorial"
                          ? `linear-gradient(160deg, #f6f1e8, color-mix(in oklab, ${theme.accent} 25%, #efe6d6))`
                          : theme.preset === "athletic"
                            ? `linear-gradient(120deg, #0a0a0a 55%, ${theme.accent} 55.2%)`
                            : `radial-gradient(80% 90% at 80% 0%, color-mix(in oklab, ${theme.accent} 45%, transparent), #06070b 70%)`,
                    }}
                  >
                    <p
                      className={
                        theme.preset === "editorial"
                          ? "absolute bottom-5 left-5 right-5 font-serif text-2xl leading-tight text-[#1f1b16]"
                          : theme.preset === "athletic"
                            ? "absolute bottom-5 left-5 right-24 text-2xl font-black uppercase italic leading-none text-white"
                            : "absolute bottom-5 left-5 right-5 text-xl font-semibold tracking-tight text-white"
                      }
                    >
                      {w.name}
                    </p>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-white">/s/{w.slug}</p>
                      {w.published ? (
                        <Badge tone="success">
                          <span className="size-1.5 rounded-full bg-success" /> Live
                        </Badge>
                      ) : (
                        <Badge tone="warning">Draft</Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-ink-400">
                      {industryLabel(w.template)} · {STYLE_PRESETS.find((p) => p.value === theme.preset)?.label} · {relativeTime(w.createdAt)}
                    </p>
                  </div>
                </Link>
                {w.published ? (
                  <a
                    href={`/s/${w.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 border-t border-white/[0.06] px-5 py-3 text-xs text-ink-300 hover:text-white"
                  >
                    <ExternalLink size={13} /> Open live site
                  </a>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
