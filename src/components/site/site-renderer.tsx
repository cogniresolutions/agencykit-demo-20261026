import { ArrowRight, Check, Mail, MapPin, Phone, Plus } from "lucide-react";
import type { CSSProperties } from "react";
import { ChatWidget } from "@/components/site/chat-widget";
import { SiteContactForm } from "@/components/site/contact-form";
import type { SiteRecord, StylePreset } from "@/lib/sites/schema";

type Palette = {
  bg: string;
  fg: string;
  muted: string;
  surface: string;
  border: string;
  accent: string;
  onAccent: string;
};

function palette(preset: StylePreset, accent: string): Palette {
  switch (preset) {
    case "editorial":
      return { bg: "#f6f1e8", fg: "#1f1b16", muted: "#6d6458", surface: "#fffaf1", border: "rgba(31,27,22,0.12)", accent, onAccent: "#ffffff" };
    case "athletic":
      return { bg: "#0a0a0a", fg: "#ffffff", muted: "#a3a3a3", surface: "#141414", border: "rgba(255,255,255,0.1)", accent, onAccent: "#0a0a0a" };
    default:
      return { bg: "#06070b", fg: "#f4f5f7", muted: "#9aa0ad", surface: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", accent, onAccent: "#ffffff" };
  }
}

function monogram(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function SiteRenderer({ site, preview = false }: { site: SiteRecord; preview?: boolean }) {
  const { sections: s, business: b, theme, features } = site;
  const p = palette(theme.preset, theme.accent);
  const preset = theme.preset;
  const vars = {
    "--site-bg": p.bg,
    "--site-fg": p.fg,
    "--site-muted": p.muted,
    "--site-surface": p.surface,
    "--site-border": p.border,
    "--site-accent": p.accent,
    "--site-on-accent": p.onAccent,
    background: p.bg,
    color: p.fg,
  } as CSSProperties;

  const isEditorial = preset === "editorial";
  const isAthletic = preset === "athletic";
  const heading = isEditorial
    ? "font-serif font-normal tracking-[-0.02em]"
    : isAthletic
      ? "font-black uppercase italic tracking-[-0.03em] leading-[0.92]"
      : "font-semibold tracking-[-0.035em]";
  const card = isEditorial
    ? "border-t border-[var(--site-border)] pt-6"
    : isAthletic
      ? "border border-[var(--site-border)] bg-[var(--site-surface)] p-7 [clip-path:polygon(0_0,100%_0,100%_calc(100%-18px),calc(100%-18px)_100%,0_100%)]"
      : "rounded-3xl border border-[var(--site-border)] bg-[var(--site-surface)] p-7 backdrop-blur";
  const btnPrimary = isAthletic
    ? "inline-flex items-center gap-2 bg-[var(--site-accent)] px-7 py-4 text-sm font-black uppercase italic tracking-wide text-[var(--site-on-accent)] [clip-path:polygon(10px_0,100%_0,calc(100%-10px)_100%,0_100%)] transition hover:brightness-110"
    : isEditorial
      ? "inline-flex items-center gap-2 rounded-full bg-[var(--site-fg)] px-6 py-3.5 text-sm font-medium text-[var(--site-bg)] transition hover:opacity-90"
      : "inline-flex items-center gap-2 rounded-full bg-[var(--site-accent)] px-6 py-3.5 text-sm font-semibold text-[var(--site-on-accent)] shadow-[0_10px_40px_-10px_var(--site-accent)] transition hover:brightness-110";
  const btnSecondary = isAthletic
    ? "inline-flex items-center gap-2 border-2 border-white/80 px-7 py-[14px] text-sm font-black uppercase italic tracking-wide text-white transition hover:bg-white hover:text-black"
    : isEditorial
      ? "inline-flex items-center gap-2 rounded-full border border-[var(--site-border)] px-6 py-3.5 text-sm font-medium transition hover:bg-black/5"
      : "inline-flex items-center gap-2 rounded-full border border-[var(--site-border)] bg-white/[0.04] px-6 py-3.5 text-sm font-medium transition hover:bg-white/[0.08]";
  const eyebrow = isAthletic
    ? "text-xs font-black uppercase italic tracking-[0.2em] text-[var(--site-accent)]"
    : isEditorial
      ? "text-xs uppercase tracking-[0.25em] text-[var(--site-muted)]"
      : "text-xs font-medium uppercase tracking-[0.22em] text-[var(--site-accent)]";

  return (
    <div style={vars} className="relative overflow-hidden font-sans antialiased">
      {/* Navigation */}
      <header className={`relative z-20 ${isEditorial ? "border-b border-[var(--site-border)]" : ""}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a href="#top" className="flex items-center gap-3">
            <span
              className={
                isAthletic
                  ? "grid size-10 place-items-center bg-[var(--site-accent)] text-sm font-black italic text-[var(--site-on-accent)] [clip-path:polygon(8px_0,100%_0,calc(100%-8px)_100%,0_100%)]"
                  : isEditorial
                    ? "grid size-10 place-items-center rounded-full border border-[var(--site-fg)] font-serif text-lg"
                    : "grid size-10 place-items-center rounded-xl bg-[var(--site-accent)] text-sm font-bold text-[var(--site-on-accent)] shadow-[0_8px_30px_-8px_var(--site-accent)]"
              }
            >
              {monogram(b.name)}
            </span>
            <span className={isAthletic ? "text-base font-black uppercase italic tracking-tight" : isEditorial ? "font-serif text-xl" : "text-[15px] font-semibold tracking-tight"}>
              {b.name}
            </span>
          </a>
          <nav className="hidden items-center gap-8 text-sm text-[var(--site-muted)] md:flex">
            <a href="#services" className="transition hover:text-[var(--site-fg)]">Services</a>
            <a href="#process" className="transition hover:text-[var(--site-fg)]">How it works</a>
            <a href="#faq" className="transition hover:text-[var(--site-fg)]">FAQ</a>
            <a href="#contact" className={isEditorial ? "rounded-full border border-[var(--site-fg)] px-4 py-2 text-[var(--site-fg)] transition hover:bg-[var(--site-fg)] hover:text-[var(--site-bg)]" : isAthletic ? "bg-white px-4 py-2 font-black uppercase italic text-black" : "rounded-full bg-white/[0.08] px-4 py-2 text-[var(--site-fg)] transition hover:bg-white/[0.14]"}>
              {s.hero.primaryCta}
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="relative">
        {preset === "midnight" ? (
          <>
            <div className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black_55%,transparent)]" style={{ background: `radial-gradient(60% 55% at 70% 20%, color-mix(in oklab, ${p.accent} 30%, transparent), transparent 70%), radial-gradient(40% 40% at 10% 80%, rgba(99,102,241,0.15), transparent 70%)` }} />
            <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
          </>
        ) : null}
        {isAthletic ? (
          <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(-55deg,#fff_0_2px,transparent_2px_22px)]" />
        ) : null}
        <div className={`relative mx-auto grid max-w-6xl items-center gap-14 px-6 ${isEditorial ? "py-24 md:grid-cols-[1.25fr_1fr]" : "py-24 md:grid-cols-[1.15fr_1fr] md:py-32"}`}>
          <div>
            <p className={eyebrow}>{s.hero.eyebrow}</p>
            <h1 className={`mt-6 text-5xl md:text-[64px] ${heading} ${isEditorial ? "leading-[1.04]" : isAthletic ? "md:text-[78px]" : "leading-[1.02]"}`}>
              {s.hero.headline}
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-[var(--site-muted)]">{s.hero.subheadline}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a href="#contact" className={btnPrimary}>
                {s.hero.primaryCta} <ArrowRight size={16} />
              </a>
              <a href="#services" className={btnSecondary}>
                {s.hero.secondaryCta}
              </a>
            </div>
          </div>
          <HeroArt preset={preset} site={site} />
        </div>
      </section>

      {isAthletic ? (
        <div className="relative -rotate-2 overflow-hidden bg-[var(--site-accent)] py-4 text-[var(--site-on-accent)]">
          <div className="flex gap-10 whitespace-nowrap text-2xl font-black uppercase italic tracking-tight">
            {Array.from({ length: 3 }).flatMap((_, k) =>
              s.services.items.map((it, i) => (
                <span key={`${k}-${i}`} className="flex items-center gap-10">
                  {it.title} <span aria-hidden="true">✦</span>
                </span>
              )),
            )}
          </div>
        </div>
      ) : null}

      {/* Services */}
      <section id="services" className={`relative ${isEditorial ? "border-t border-[var(--site-border)]" : ""}`}>
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className={isEditorial ? "grid gap-10 md:grid-cols-[1fr_2fr]" : "max-w-2xl"}>
            <div>
              <p className={eyebrow}>{isEditorial ? "01 / Services" : "Services"}</p>
              <h2 className={`mt-4 text-4xl md:text-5xl ${heading}`}>{s.services.title}</h2>
            </div>
            <p className={`text-lg leading-relaxed text-[var(--site-muted)] ${isEditorial ? "md:pt-10" : "mt-5"}`}>{s.services.intro}</p>
          </div>
          <div className={`mt-14 grid gap-5 ${s.services.items.length === 4 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
            {s.services.items.map((it, i) => (
              <article key={it.title} className={card}>
                {isEditorial ? (
                  <p className="font-serif text-sm italic text-[var(--site-accent)]">No. {String(i + 1).padStart(2, "0")}</p>
                ) : (
                  <span
                    className={
                      isAthletic
                        ? "text-4xl font-black italic text-[var(--site-accent)]"
                        : "grid size-11 place-items-center rounded-2xl text-sm font-semibold text-[var(--site-accent)]"
                    }
                    style={isAthletic ? undefined : { background: `color-mix(in oklab, ${p.accent} 14%, transparent)` }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                )}
                <h3 className={`mt-5 text-xl ${isEditorial ? "font-serif" : isAthletic ? "font-black uppercase italic" : "font-semibold tracking-tight"}`}>{it.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--site-muted)]">{it.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className={`relative ${isEditorial ? "bg-[var(--site-fg)] text-[var(--site-bg)]" : ""}`}>
        <div className="mx-auto grid max-w-6xl gap-14 px-6 py-24 md:grid-cols-[1fr_1.4fr]">
          <div>
            <p className={isEditorial ? "text-xs uppercase tracking-[0.25em] opacity-60" : eyebrow}>{isEditorial ? "02 / Why us" : "Why us"}</p>
            <h2 className={`mt-4 text-4xl md:text-5xl ${heading}`}>{s.whyUs.title}</h2>
          </div>
          <ul className="grid gap-8 sm:grid-cols-2">
            {s.whyUs.points.map((pt) => (
              <li key={pt.title}>
                <span
                  className={`grid size-8 place-items-center ${isAthletic ? "bg-[var(--site-accent)] text-[var(--site-on-accent)]" : "rounded-full"}`}
                  style={isAthletic ? undefined : { background: `color-mix(in oklab, ${p.accent} ${isEditorial ? "85%" : "18%"}, transparent)`, color: isEditorial ? "#fff" : p.accent }}
                >
                  <Check size={15} strokeWidth={3} />
                </span>
                <h3 className={`mt-4 text-lg ${isEditorial ? "font-serif text-xl" : isAthletic ? "font-black uppercase italic" : "font-semibold"}`}>{pt.title}</h3>
                <p className={`mt-2 text-[15px] leading-relaxed ${isEditorial ? "opacity-70" : "text-[var(--site-muted)]"}`}>{pt.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Process */}
      <section id="process" className="relative">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className={eyebrow}>{isEditorial ? "03 / Process" : "How it works"}</p>
          <h2 className={`mt-4 max-w-2xl text-4xl md:text-5xl ${heading}`}>{s.process.title}</h2>
          <ol className="relative mt-14 grid gap-6 md:grid-cols-3">
            {s.process.steps.map((st, i) => (
              <li key={st.title} className={card}>
                <span className={isAthletic ? "text-6xl font-black italic text-transparent [-webkit-text-stroke:1.5px_var(--site-accent)]" : isEditorial ? "font-serif text-5xl text-[var(--site-accent)]" : "text-sm font-semibold text-[var(--site-accent)]"}>
                  {isAthletic || isEditorial ? i + 1 : `Step ${i + 1}`}
                </span>
                <h3 className={`mt-4 text-xl ${isEditorial ? "font-serif" : isAthletic ? "font-black uppercase italic" : "font-semibold tracking-tight"}`}>{st.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--site-muted)]">{st.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className={isEditorial ? "border-t border-[var(--site-border)]" : ""}>
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-[1fr_1.6fr]">
          <div>
            <p className={eyebrow}>{isEditorial ? "04 / Questions" : "FAQ"}</p>
            <h2 className={`mt-4 text-4xl md:text-5xl ${heading}`}>{s.faq.title}</h2>
          </div>
          <div className="divide-y divide-[var(--site-border)] border-y border-[var(--site-border)]">
            {s.faq.items.map((f) => (
              <details key={f.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-[17px] font-medium [&::-webkit-details-marker]:hidden">
                  <span className={isEditorial ? "font-serif text-xl font-normal" : isAthletic ? "font-bold uppercase" : ""}>{f.question}</span>
                  <Plus size={18} className="shrink-0 text-[var(--site-accent)] transition group-open:rotate-45" />
                </summary>
                <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--site-muted)]">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + contact */}
      <section id="contact" className="relative">
        <div className="mx-auto max-w-6xl px-6 pb-24">
          <div
            className={
              isAthletic
                ? "relative grid gap-12 overflow-hidden border border-[var(--site-border)] bg-[var(--site-surface)] p-10 md:grid-cols-2 md:p-14"
                : isEditorial
                  ? "grid gap-12 rounded-[28px] border border-[var(--site-border)] bg-[var(--site-surface)] p-10 md:grid-cols-2 md:p-14"
                  : "relative grid gap-12 overflow-hidden rounded-[32px] border border-[var(--site-border)] bg-[var(--site-surface)] p-10 md:grid-cols-2 md:p-14"
            }
          >
            {preset === "midnight" ? (
              <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(50% 70% at 0% 0%, color-mix(in oklab, ${p.accent} 22%, transparent), transparent 70%)` }} />
            ) : null}
            <div className="relative">
              <h2 className={`text-4xl md:text-5xl ${heading}`}>{s.cta.headline}</h2>
              <p className="mt-5 text-lg leading-relaxed text-[var(--site-muted)]">{s.cta.body}</p>
              <ul className="mt-8 grid gap-3 text-[15px]">
                {b.phone ? (
                  <li className="flex items-center gap-3">
                    <Phone size={16} className="text-[var(--site-accent)]" />
                    <a href={`tel:${b.phone.replace(/[^0-9+]/g, "")}`} className="hover:underline">{b.phone}</a>
                  </li>
                ) : null}
                {b.email ? (
                  <li className="flex items-center gap-3">
                    <Mail size={16} className="text-[var(--site-accent)]" />
                    <a href={`mailto:${b.email}`} className="hover:underline">{b.email}</a>
                  </li>
                ) : null}
                {b.city ? (
                  <li className="flex items-center gap-3">
                    <MapPin size={16} className="text-[var(--site-accent)]" />
                    {b.city}
                  </li>
                ) : null}
              </ul>
            </div>
            <div className="relative">
              {features.contactForm ? (
                <SiteContactForm siteSlug={site.slug} preset={preset} buttonLabel={s.cta.button} preview={preview} />
              ) : (
                <div className="flex h-full flex-col justify-center">
                  <a href={b.phone ? `tel:${b.phone.replace(/[^0-9+]/g, "")}` : b.email ? `mailto:${b.email}` : "#top"} className={btnPrimary}>
                    {s.cta.button} <ArrowRight size={16} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--site-border)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-[var(--site-muted)]">
          <p>
            © {new Date().getFullYear()} {b.name}
            {b.city ? ` · ${b.city}` : ""}
          </p>
          <p>{b.tagline}</p>
        </div>
      </footer>

      {features.chatWidget ? <ChatWidget siteSlug={site.slug} businessName={b.name} accent={p.accent} preset={preset} preview={preview} /> : null}
    </div>
  );
}

const KINETIC_WORDS: Record<string, string[]> = {
  fitness: ["Train", "Recover", "Repeat"],
  ai_automation: ["Build", "Automate", "Scale"],
  real_estate: ["Search", "Offer", "Move in"],
  dental: ["Clean", "Bright", "Healthy"],
  restaurant: ["Fresh", "Local", "Daily"],
  other: ["Plan", "Build", "Deliver"],
};

function HeroArt({ preset, site }: { preset: StylePreset; site: SiteRecord }) {
  const { sections: s, business: b, theme } = site;
  if (preset === "editorial") {
    return (
      <div className="relative hidden md:block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] border border-[var(--site-border)]" style={{ background: `linear-gradient(160deg, color-mix(in oklab, ${theme.accent} 28%, #f6f1e8), #efe6d6 55%, #e7dcc8)` }}>
          <div className="absolute inset-0 [background-image:radial-gradient(rgba(31,27,22,0.08)_1px,transparent_1px)] [background-size:14px_14px]" />
          <span className="absolute -right-6 bottom-[-40px] font-serif text-[260px] leading-none text-[var(--site-fg)] opacity-[0.08]">{monogram(b.name).slice(0, 1)}</span>
          <div className="absolute left-8 top-8 right-8">
            <p className="font-serif text-sm italic text-[var(--site-muted)]">{b.city || "Est. locally"}</p>
            <div className="mt-3 h-px bg-[var(--site-border)]" />
          </div>
          <div className="absolute bottom-8 left-8 right-8 rounded-2xl bg-[var(--site-surface)]/90 p-6 shadow-[0_30px_60px_-30px_rgba(31,27,22,0.35)] backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--site-muted)]">What we offer</p>
            <ul className="mt-3 grid gap-2">
              {s.services.items.slice(0, 4).map((it) => (
                <li key={it.title} className="flex items-center justify-between border-b border-[var(--site-border)] pb-2 font-serif text-lg last:border-0 last:pb-0">
                  {it.title}
                  <ArrowRight size={14} className="text-[var(--site-accent)]" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }
  if (preset === "athletic") {
    return (
      <div className="relative hidden h-[460px] md:block">
        <div className="absolute inset-0 bg-[var(--site-accent)] [clip-path:polygon(18%_0,100%_0,82%_100%,0_100%)]" />
        <div className="absolute inset-0 bg-[#111] [clip-path:polygon(24%_6%,96%_6%,78%_94%,6%_94%)]" />
        <div className="absolute inset-0 flex flex-col justify-center gap-1 pl-[18%] pr-[12%]">
          {(KINETIC_WORDS[site.template] ?? KINETIC_WORDS.other).map((w, i) => (
            <span key={w} className="text-[clamp(2.25rem,4vw,3.75rem)] font-black uppercase italic leading-none tracking-tighter" style={{ color: i === 1 ? theme.accent : "transparent", WebkitTextStroke: i === 1 ? undefined : "1.5px rgba(255,255,255,0.85)" }}>
              {w}
            </span>
          ))}
          <p className="mt-6 max-w-[240px] text-sm font-bold uppercase tracking-wide text-white/70">{s.services.items[0]?.title} · {s.services.items[1]?.title}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="relative hidden h-[440px] md:block">
      <div className="absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ background: `color-mix(in oklab, ${theme.accent} 45%, transparent)` }} />
      <div className="absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" style={{ background: `radial-gradient(circle at 30% 30%, color-mix(in oklab, ${theme.accent} 70%, white), ${theme.accent} 45%, color-mix(in oklab, ${theme.accent} 30%, #06070b) 100%)`, boxShadow: `0 40px 120px -20px ${theme.accent}` }} />
      {s.services.items.slice(0, 3).map((it, i) => (
        <div
          key={it.title}
          className="absolute w-64 rounded-2xl border border-white/10 bg-[#0d0f15]/80 p-4 shadow-2xl backdrop-blur-xl"
          style={[{ left: "0%", top: "8%" }, { right: "0%", top: "40%" }, { left: "8%", bottom: "4%" }][i]}
        >
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-lg text-[11px] font-semibold" style={{ background: `color-mix(in oklab, ${theme.accent} 20%, transparent)`, color: theme.accent }}>
              {i + 1}
            </span>
            <p className="text-sm font-medium leading-snug">{it.title}</p>
          </div>
          <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-[var(--site-muted)]">{it.description}</p>
        </div>
      ))}
    </div>
  );
}
