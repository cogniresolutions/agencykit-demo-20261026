"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { StylePreset } from "@/lib/sites/schema";

export function SiteContactForm({
  siteSlug,
  preset,
  buttonLabel,
  preview,
}: {
  siteSlug: string;
  preset: StylePreset;
  buttonLabel: string;
  preview?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const field =
    preset === "editorial"
      ? "w-full rounded-xl border border-[var(--site-border)] bg-white/70 px-4 py-3 text-[15px] text-[var(--site-fg)] placeholder:text-[var(--site-muted)]/70 outline-none focus:border-[var(--site-accent)]"
      : preset === "athletic"
        ? "w-full border border-white/15 bg-black/40 px-4 py-3 text-[15px] text-white placeholder:text-white/40 outline-none focus:border-[var(--site-accent)]"
        : "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-[15px] text-white placeholder:text-white/40 outline-none focus:border-[var(--site-accent)]";
  const button =
    preset === "athletic"
      ? "inline-flex w-full items-center justify-center gap-2 bg-[var(--site-accent)] px-6 py-4 text-sm font-black uppercase italic tracking-wide text-[var(--site-on-accent)] disabled:opacity-60"
      : preset === "editorial"
        ? "inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--site-fg)] px-6 py-3.5 text-sm font-medium text-[var(--site-bg)] disabled:opacity-60"
        : "inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--site-accent)] px-6 py-3.5 text-sm font-semibold text-[var(--site-on-accent)] disabled:opacity-60";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (preview) return;
    const form = new FormData(e.currentTarget);
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/public/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site: siteSlug,
          formName: "Contact form",
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          message: form.get("message"),
          website: form.get("website"),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError((err as Error).message);
    }
  }

  if (status === "sent") {
    return (
      <div className="flex h-full flex-col items-center justify-center py-10 text-center">
        <CheckCircle2 size={40} className="text-[var(--site-accent)]" />
        <p className="mt-4 text-xl font-semibold">Thanks, your message is in.</p>
        <p className="mt-2 text-[15px] text-[var(--site-muted)]">We will get back to you shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3" noValidate={false}>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" required maxLength={120} placeholder="Your name" className={field} aria-label="Your name" />
        <input name="phone" maxLength={40} placeholder="Phone (optional)" className={field} aria-label="Phone" />
      </div>
      <input name="email" type="email" required maxLength={254} placeholder="Email address" className={field} aria-label="Email address" />
      <textarea name="message" rows={4} maxLength={2000} placeholder="How can we help?" className={`${field} resize-none`} aria-label="Message" />
      {/* Honeypot: real visitors never see or fill this field. */}
      <div aria-hidden="true" className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {status === "error" ? <p className="text-sm text-red-500">{error}</p> : null}
      <button type="submit" disabled={status === "sending" || preview} className={button}>
        {status === "sending" ? "Sending..." : buttonLabel} <ArrowRight size={16} />
      </button>
      {preview ? <p className="text-center text-xs text-[var(--site-muted)]">Preview mode: publish the site to accept submissions.</p> : null}
    </form>
  );
}
