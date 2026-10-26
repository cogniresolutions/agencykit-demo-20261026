import "server-only";
import { aiEnabled, claudeText } from "@/lib/ai";
import { industryLabel, sectionsSchema, type Business, type Industry, type Sections } from "@/lib/sites/schema";
import { buildTemplateSections } from "@/lib/sites/templates";

const SYSTEM = `You are a senior conversion copywriter building a small-business website.
Return ONLY a JSON object, no markdown fences, matching this TypeScript type exactly:
{
  "hero": { "eyebrow": string<=60, "headline": string<=110, "subheadline": string<=260, "primaryCta": string<=32, "secondaryCta": string<=32 },
  "services": { "title": string<=80, "intro": string<=240, "items": { "title": string<=60, "description": string<=220 }[3..6] },
  "whyUs": { "title": string<=80, "points": { "title": string<=60, "description": string<=220 }[3..4] },
  "process": { "title": string<=80, "steps": { "title": string<=60, "description": string<=200 }[exactly 3] },
  "faq": { "title": string<=80, "items": { "question": string<=140, "answer": string<=400 }[3..6] },
  "cta": { "headline": string<=110, "body": string<=240, "button": string<=32 },
  "seo": { "title": string<=70, "description": string<=160 }
}
Rules: plain, specific, warm language. No testimonials, no invented statistics, awards, prices, years in business or customer counts.
Use only the facts provided. Use the listed services as the service items.`;

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in response");
  return JSON.parse(text.slice(start, end + 1));
}

export async function generateSections(
  industry: Industry,
  business: Business,
): Promise<{ sections: Sections; generatedBy: "claude" | "template"; note?: string }> {
  if (!aiEnabled()) {
    return { sections: buildTemplateSections(industry, business), generatedBy: "template" };
  }
  try {
    const facts = {
      industry: industryLabel(industry),
      businessName: business.name,
      tagline: business.tagline,
      services: business.services,
      city: business.city || undefined,
      phone: business.phone || undefined,
      email: business.email || undefined,
    };
    const text = await claudeText({
      system: SYSTEM,
      maxTokens: 4000,
      messages: [{ role: "user", content: `Business facts (JSON):\n${JSON.stringify(facts)}` }],
    });
    const parsed = sectionsSchema.safeParse(extractJson(text));
    if (!parsed.success) throw new Error("response did not match the section schema");
    return { sections: parsed.data, generatedBy: "claude" };
  } catch (err) {
    console.warn("[websites] Claude generation failed, using template:", (err as Error).message);
    return {
      sections: buildTemplateSections(industry, business),
      generatedBy: "template",
      note: "Claude was unavailable, so a built-in template was used.",
    };
  }
}
