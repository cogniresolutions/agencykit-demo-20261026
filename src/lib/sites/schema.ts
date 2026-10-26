import { z } from "zod";

export const INDUSTRIES = [
  { value: "ai_automation", label: "AI automation agency" },
  { value: "real_estate", label: "Real estate" },
  { value: "fitness", label: "Fitness studio" },
  { value: "dental", label: "Dental clinic" },
  { value: "restaurant", label: "Restaurant" },
  { value: "other", label: "Other" },
] as const;
export type Industry = (typeof INDUSTRIES)[number]["value"];
export const industryValues = INDUSTRIES.map((i) => i.value) as [Industry, ...Industry[]];
export function industryLabel(value: string) {
  return INDUSTRIES.find((i) => i.value === value)?.label ?? "Other";
}

export const STYLE_PRESETS = [
  {
    value: "midnight",
    label: "Midnight Modern",
    description: "Deep dark canvas, soft glows and crisp type. Feels like a premium tech brand.",
  },
  {
    value: "editorial",
    label: "Warm Editorial",
    description: "Cream paper tones, elegant serif headlines and generous whitespace.",
  },
  {
    value: "athletic",
    label: "Bold Athletic",
    description: "High contrast, heavy uppercase headlines and kinetic diagonal energy.",
  },
] as const;
export type StylePreset = (typeof STYLE_PRESETS)[number]["value"];
export const styleValues = STYLE_PRESETS.map((s) => s.value) as [StylePreset, ...StylePreset[]];

const short = (max: number) => z.string().trim().min(1).max(max);

export const businessSchema = z.object({
  name: short(80),
  tagline: short(140),
  services: z.array(short(60)).min(1).max(6),
  phone: z.string().trim().max(40).regex(/^[0-9+().\-\s]*$/, "Use digits, spaces and + ( ) - only"),
  email: z.union([z.literal(""), z.email().max(120)]),
  city: z.string().trim().max(80),
});
export type Business = z.infer<typeof businessSchema>;

export const featuresSchema = z.object({
  contactForm: z.boolean(),
  chatWidget: z.boolean(),
});
export type Features = z.infer<typeof featuresSchema>;

export const themeSchema = z.object({
  preset: z.enum(styleValues),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
export type Theme = z.infer<typeof themeSchema>;

/** The structured content Claude (or a template) must produce. */
export const sectionsSchema = z.object({
  hero: z.object({
    eyebrow: short(60),
    headline: short(110),
    subheadline: short(260),
    primaryCta: short(32),
    secondaryCta: short(32),
  }),
  services: z.object({
    title: short(80),
    intro: short(240),
    items: z
      .array(z.object({ title: short(60), description: short(220) }))
      .min(3)
      .max(6),
  }),
  whyUs: z.object({
    title: short(80),
    points: z
      .array(z.object({ title: short(60), description: short(220) }))
      .min(3)
      .max(4),
  }),
  process: z.object({
    title: short(80),
    steps: z
      .array(z.object({ title: short(60), description: short(200) }))
      .length(3),
  }),
  faq: z.object({
    title: short(80),
    items: z
      .array(z.object({ question: short(140), answer: short(400) }))
      .min(3)
      .max(6),
  }),
  cta: z.object({
    headline: short(110),
    body: short(240),
    button: short(32),
  }),
  seo: z.object({
    title: short(70),
    description: short(160),
  }),
});
export type Sections = z.infer<typeof sectionsSchema>;

export type SiteRecord = {
  id: string;
  slug: string;
  name: string;
  template: string;
  theme: Theme;
  business: Business;
  sections: Sections;
  features: Features;
  published: boolean;
  generatedBy: "claude" | "template";
};
