"use client";

import { ArrowLeft, ArrowRight, Bot, Building2, Check, Dumbbell, FileText, HeartPulse, Loader2, MessageCircle, Sparkles, UtensilsCrossed, Wand2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { generateWebsiteAction } from "@/app/app/[sub]/websites/actions";
import { Button, Card, Field, Input, cx } from "@/components/ui";
import { INDUSTRIES, STYLE_PRESETS, type Industry, type StylePreset } from "@/lib/sites/schema";

const INDUSTRY_ICONS: Record<Industry, typeof Bot> = {
  ai_automation: Bot,
  real_estate: Building2,
  fitness: Dumbbell,
  dental: HeartPulse,
  restaurant: UtensilsCrossed,
  other: Sparkles,
};

const STEPS = ["Template", "Business", "Design", "Speed to lead", "Generate"];

type Defaults = Record<Industry, { services: string[]; tagline: string; style: StylePreset }>;

export function WebsiteWizard({
  subId,
  subName,
  defaultIndustry,
  accent,
  defaults,
  aiEnabled,
}: {
  subId: string;
  subName: string;
  defaultIndustry: Industry;
  accent: string;
  defaults: Defaults;
  aiEnabled: boolean;
}) {
  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState<Industry>(defaultIndustry);
  const [name, setName] = useState(subName);
  const [tagline, setTagline] = useState(defaults[defaultIndustry].tagline);
  const [services, setServices] = useState<string[]>(defaults[defaultIndustry].services);
  const [serviceDraft, setServiceDraft] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [style, setStyle] = useState<StylePreset>(defaults[defaultIndustry].style);
  const [contactForm, setContactForm] = useState(true);
  const [chatWidget, setChatWidget] = useState(true);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function chooseIndustry(i: Industry) {
    setIndustry(i);
    setTagline(defaults[i].tagline);
    setServices(defaults[i].services);
    setStyle(defaults[i].style);
  }

  function addService() {
    const v = serviceDraft.trim().slice(0, 60);
    if (v && services.length < 6 && !services.includes(v)) setServices([...services, v]);
    setServiceDraft("");
  }

  const businessValid = name.trim().length > 0 && tagline.trim().length > 0 && services.length > 0 && /^[0-9+().\-\s]*$/.test(phone) && (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

  function next() {
    setError("");
    if (step === 1 && !businessValid) {
      setError("Add a business name, tagline, at least one service and a valid phone and email.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function generate() {
    setError("");
    startTransition(async () => {
      const res = await generateWebsiteAction({
        subId,
        industry,
        style,
        business: { name, tagline, services, phone, email, city },
        features: { contactForm, chatWidget },
      });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <ol className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={cx(
                "flex items-center gap-2.5 text-left text-xs font-medium transition",
                i === step ? "text-white" : i < step ? "text-ink-300 hover:text-white" : "text-ink-500",
              )}
              disabled={i > step}
            >
              <span
                className={cx(
                  "grid size-7 shrink-0 place-items-center rounded-full border text-[11px]",
                  i < step ? "border-transparent bg-accent text-white" : i === step ? "border-[var(--accent)] text-accent" : "border-white/10",
                )}
              >
                {i < step ? <Check size={13} strokeWidth={3} /> : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEPS.length - 1 ? <span className={cx("h-px flex-1", i < step ? "bg-accent" : "bg-white/10")} /> : null}
          </li>
        ))}
      </ol>

      <Card className="relative overflow-hidden p-8">
        <div className="accent-glow pointer-events-none absolute inset-x-0 top-0 h-40 opacity-60" />
        <div className="relative min-h-[380px]">
          {step === 0 ? (
            <section className="animate-fade-up">
              <h2 className="text-xl font-semibold text-white">Pick a starting template</h2>
              <p className="mt-1 text-sm text-ink-300">Each industry template comes with tailored copy, sections and a recommended design.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {INDUSTRIES.map((i) => {
                  const Icon = INDUSTRY_ICONS[i.value];
                  const active = industry === i.value;
                  return (
                    <button
                      key={i.value}
                      type="button"
                      onClick={() => chooseIndustry(i.value)}
                      className={cx(
                        "group flex flex-col items-start gap-4 rounded-2xl border p-5 text-left transition",
                        active ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20",
                      )}
                    >
                      <span className={cx("grid size-10 place-items-center rounded-xl", active ? "bg-accent text-white" : "bg-white/[0.06] text-ink-200")}>
                        <Icon size={18} />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-white">{i.label}</span>
                        <span className="mt-1 block text-xs text-ink-400">{defaults[i.value].services.slice(0, 2).join(" · ")}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="grid animate-fade-up gap-5">
              <div>
                <h2 className="text-xl font-semibold text-white">Business details</h2>
                <p className="mt-1 text-sm text-ink-300">Only facts you provide are used. Nothing is invented.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Business name" htmlFor="w-name">
                  <Input id="w-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                </Field>
                <Field label="City" htmlFor="w-city">
                  <Input id="w-city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} placeholder="Austin, TX" />
                </Field>
              </div>
              <Field label="Tagline" htmlFor="w-tagline">
                <Input id="w-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={140} />
              </Field>
              <Field label="Services" hint="Up to 6. Press Enter to add.">
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-ink-900/80 p-2">
                  {services.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.07] px-2.5 py-1 text-xs text-ink-100">
                      {s}
                      <button type="button" onClick={() => setServices(services.filter((x) => x !== s))} aria-label={`Remove ${s}`} className="text-ink-400 hover:text-white">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  {services.length < 6 ? (
                    <input
                      value={serviceDraft}
                      onChange={(e) => setServiceDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addService();
                        }
                      }}
                      onBlur={addService}
                      placeholder="Add a service"
                      className="h-7 min-w-32 flex-1 bg-transparent px-1 text-sm text-ink-100 outline-none placeholder:text-ink-500"
                      maxLength={60}
                    />
                  ) : null}
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone" htmlFor="w-phone">
                  <Input id="w-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} placeholder="(512) 555-0142" />
                </Field>
                <Field label="Email" htmlFor="w-email">
                  <Input id="w-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} placeholder="hello@business.com" />
                </Field>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="animate-fade-up">
              <h2 className="text-xl font-semibold text-white">Design direction</h2>
              <p className="mt-1 text-sm text-ink-300">Three distinct looks. The sub-account brand color is used as the accent.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {STYLE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setStyle(p.value)}
                    className={cx(
                      "overflow-hidden rounded-2xl border text-left transition",
                      style === p.value ? "border-[var(--accent)] ring-4 ring-[var(--accent)]/15" : "border-white/[0.08] hover:border-white/20",
                    )}
                  >
                    <StyleThumb preset={p.value} accent={accent} />
                    <div className="p-4">
                      <p className="flex items-center justify-between text-sm font-semibold text-white">
                        {p.label}
                        {style === p.value ? <Check size={15} className="text-accent" /> : null}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-400">{p.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="animate-fade-up">
              <h2 className="text-xl font-semibold text-white">Speed to lead</h2>
              <p className="mt-1 text-sm text-ink-300">Every submission lands in Contacts and Conversations instantly.</p>
              <div className="mt-6 grid gap-3">
                <Toggle
                  icon={FileText}
                  title="Contact form"
                  body="Validated form with spam protection. Creates a contact tagged with the form name and opens a conversation."
                  checked={contactForm}
                  onChange={setContactForm}
                />
                <Toggle
                  icon={MessageCircle}
                  title="AI chat widget"
                  body={
                    aiEnabled
                      ? "A floating assistant answers visitors using your website content, then captures their name and email."
                      : "Captures questions and contact details. Add ANTHROPIC_API_KEY to let Claude answer using your website content."
                  }
                  checked={chatWidget}
                  onChange={setChatWidget}
                />
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <section className="animate-fade-up">
              <h2 className="text-xl font-semibold text-white">Ready to generate</h2>
              <p className="mt-1 text-sm text-ink-300">
                {aiEnabled ? "Claude will write the copy as structured sections, validated before saving." : "A high-quality industry template will be filled with your details."}
              </p>
              <dl className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06] sm:grid-cols-2">
                {[
                  ["Template", INDUSTRIES.find((i) => i.value === industry)?.label],
                  ["Business", name],
                  ["Services", services.join(", ")],
                  ["Design", STYLE_PRESETS.find((p) => p.value === style)?.label],
                  ["Contact form", contactForm ? "On" : "Off"],
                  ["AI chat widget", chatWidget ? "On" : "Off"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-ink-850 px-5 py-4">
                    <dt className="text-xs text-ink-400">{k}</dt>
                    <dd className="mt-1 truncate text-sm font-medium text-white">{v}</dd>
                  </div>
                ))}
              </dl>
              {pending ? (
                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 text-sm text-ink-200">
                  <Loader2 size={18} className="animate-spin text-accent" />
                  {aiEnabled ? "Claude is writing your hero, services, FAQ and call to action..." : "Building your website..."}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        {error ? <p className="relative mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}

        <div className="relative mt-8 flex items-center justify-between border-t border-white/[0.06] pt-6">
          <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}>
            <ArrowLeft size={16} /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>
              Continue <ArrowRight size={16} />
            </Button>
          ) : (
            <Button type="button" onClick={generate} disabled={pending} className="px-6">
              {pending ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              {pending ? "Generating..." : "Generate website"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function Toggle({ icon: Icon, title, body, checked, onChange }: { icon: typeof Bot; title: string; body: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={cx("flex cursor-pointer items-start gap-4 rounded-2xl border p-5 transition", checked ? "border-[var(--accent)]/60 bg-white/[0.04]" : "border-white/[0.08] bg-white/[0.02]")}>
      <span className={cx("grid size-10 shrink-0 place-items-center rounded-xl", checked ? "bg-accent text-white" : "bg-white/[0.06] text-ink-300")}>
        <Icon size={18} />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-ink-400">{body}</span>
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={cx("relative mt-1 h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-accent" : "bg-white/15")}>
        <span className={cx("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </span>
    </label>
  );
}

function StyleThumb({ preset, accent }: { preset: StylePreset; accent: string }) {
  if (preset === "editorial") {
    return (
      <div className="relative h-36 bg-[#f6f1e8] p-4">
        <div className="h-1.5 w-10 rounded bg-[#1f1b16]/70" />
        <p className="mt-4 font-serif text-[22px] leading-tight text-[#1f1b16]">Calm, elegant
          <br />
          <span className="italic">and inviting.</span>
        </p>
        <div className="absolute bottom-4 left-4 h-5 w-20 rounded-full bg-[#1f1b16]" />
        <div className="absolute bottom-4 right-4 size-12 rounded-xl" style={{ background: `linear-gradient(160deg, ${accent}55, #e7dcc8)` }} />
      </div>
    );
  }
  if (preset === "athletic") {
    return (
      <div className="relative h-36 overflow-hidden bg-[#0a0a0a] p-4">
        <div className="absolute inset-0 opacity-10 [background-image:repeating-linear-gradient(-55deg,#fff_0_2px,transparent_2px_14px)]" />
        <p className="relative text-[24px] font-black uppercase italic leading-[0.9] tracking-tight text-white">
          Go
          <br />
          <span style={{ color: accent }}>harder.</span>
        </p>
        <div className="absolute bottom-4 left-4 h-5 w-20 [clip-path:polygon(6px_0,100%_0,calc(100%-6px)_100%,0_100%)]" style={{ background: accent }} />
      </div>
    );
  }
  return (
    <div className="relative h-36 overflow-hidden bg-[#06070b] p-4">
      <div className="absolute -right-6 -top-6 size-28 rounded-full blur-2xl" style={{ background: `${accent}66` }} />
      <p className="relative text-[20px] font-semibold leading-tight tracking-tight text-white">
        Modern and
        <br />
        precise.
      </p>
      <div className="absolute bottom-4 left-4 h-5 w-20 rounded-full" style={{ background: accent }} />
      <div className="absolute bottom-4 right-4 h-10 w-16 rounded-lg border border-white/10 bg-white/5" />
    </div>
  );
}
