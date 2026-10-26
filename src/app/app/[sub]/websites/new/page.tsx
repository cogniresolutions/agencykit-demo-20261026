import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { WebsiteWizard } from "@/components/website-wizard";
import { aiEnabled } from "@/lib/ai";
import { getTenant } from "@/lib/page-tenant";
import { INDUSTRIES, type Industry } from "@/lib/sites/schema";
import { INDUSTRY_PACKS } from "@/lib/sites/templates";

export const metadata: Metadata = { title: "Generate website" };

export default async function NewWebsitePage({ params }: { params: Promise<{ sub: string }> }) {
  const { sub } = await params;
  const { subAccount } = await getTenant(sub);
  const defaults = Object.fromEntries(
    INDUSTRIES.map((i) => [
      i.value,
      {
        services: INDUSTRY_PACKS[i.value].defaultServices,
        tagline: INDUSTRY_PACKS[i.value].sampleTagline,
        style: INDUSTRY_PACKS[i.value].defaultStyle,
      },
    ]),
  ) as Record<Industry, { services: string[]; tagline: string; style: "midnight" | "editorial" | "athletic" }>;
  const industry = (INDUSTRIES.some((i) => i.value === subAccount.industry) ? subAccount.industry : "other") as Industry;

  return (
    <div className="px-10 py-10">
      <PageHeader eyebrow={subAccount.name} title="Generate website" description={aiEnabled() ? "Powered by Claude. Copy is generated as structured JSON and validated before saving." : "Using built-in industry templates. Add ANTHROPIC_API_KEY to generate copy with Claude."} />
      <WebsiteWizard subId={subAccount.id} subName={subAccount.name} defaultIndustry={industry} accent={subAccount.brandColor} defaults={defaults} aiEnabled={aiEnabled()} />
    </div>
  );
}
