"use client";

import { MessageCircle, SendHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { StylePreset } from "@/lib/sites/schema";

type Msg = { role: "user" | "assistant"; text: string };

export function ChatWidget({
  siteSlug,
  businessName,
  accent,
  preset,
  preview,
}: {
  siteSlug: string;
  businessName: string;
  accent: string;
  preset: StylePreset;
  preview?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: `Hi! I am the ${businessName} assistant. Ask me anything about our services.` },
  ]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showLead, setShowLead] = useState(false);
  const [leadDone, setLeadDone] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, showLead]);

  const light = preset === "editorial";
  const panel = light ? "bg-[#fffaf1] text-[#1f1b16] border-black/10" : "bg-[#0d0f14] text-white border-white/10";
  const bubbleIn = light ? "bg-black/[0.05]" : "bg-white/[0.07]";
  const inputCls = light
    ? "border-black/10 bg-white text-[#1f1b16] placeholder:text-black/40"
    : "border-white/10 bg-white/[0.05] text-white placeholder:text-white/40";

  async function send(payload: { message: string; name?: string; email?: string }) {
    setSending(true);
    try {
      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: siteSlug, conversationId, ...payload }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; conversationId?: string; error?: string; leadCaptured?: boolean };
      if (!res.ok) throw new Error(data.error ?? "Chat is unavailable right now.");
      if (data.conversationId) setConversationId(data.conversationId);
      if (data.reply) setMessages((m) => [...m, { role: "assistant", text: data.reply! }]);
      if (data.leadCaptured) setLeadDone(true);
      const userTurns = messages.filter((m) => m.role === "user").length + 1;
      if (!leadDone && !data.leadCaptured && userTurns >= 1) setShowLead(true);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", text: (err as Error).message }]);
    } finally {
      setSending(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const text = String(new FormData(form).get("message") ?? "").trim().slice(0, 1000);
    if (!text || sending) return;
    form.reset();
    setMessages((m) => [...m, { role: "user", text }]);
    if (preview) {
      setMessages((m) => [...m, { role: "assistant", text: "Preview mode: publish the site to chat with the assistant." }]);
      return;
    }
    await send({ message: text });
  }

  async function onLead(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    const email = String(f.get("email") ?? "").trim();
    if (!name || !email || preview) return;
    setShowLead(false);
    setMessages((m) => [...m, { role: "user", text: `My name is ${name}, email ${email}` }]);
    await send({ message: `My name is ${name} and my email is ${email}.`, name, email });
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans" style={preview ? { position: "absolute" } : undefined}>
      {open ? (
        <div className={`flex h-[520px] w-[360px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-3xl border shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ${panel}`}>
          <div className="flex items-center gap-3 px-5 py-4" style={{ background: accent, color: preset === "athletic" ? "#0a0a0a" : "#fff" }}>
            <span className="grid size-9 place-items-center rounded-full bg-white/20">
              <MessageCircle size={17} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">{businessName}</p>
              <p className="text-xs opacity-80">Typically replies instantly</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-full p-1.5 hover:bg-white/20">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <p
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${m.role === "user" ? "rounded-br-md text-white" : `rounded-bl-md ${bubbleIn}`}`}
                  style={m.role === "user" ? { background: accent, color: preset === "athletic" ? "#0a0a0a" : "#fff" } : undefined}
                >
                  {m.text}
                </p>
              </div>
            ))}
            {sending ? (
              <div className="flex gap-1 px-2 py-1" aria-label="Assistant is typing">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="size-1.5 animate-bounce rounded-full opacity-60" style={{ background: accent, animationDelay: `${d * 120}ms` }} />
                ))}
              </div>
            ) : null}
            {showLead && !leadDone ? (
              <form onSubmit={onLead} className={`grid gap-2 rounded-2xl border p-3 ${light ? "border-black/10" : "border-white/10"}`}>
                <p className="text-xs opacity-70">Want the team to follow up? Leave your details.</p>
                <input name="name" required maxLength={120} placeholder="Name" className={`rounded-lg border px-3 py-2 text-sm outline-none ${inputCls}`} />
                <input name="email" type="email" required maxLength={254} placeholder="Email" className={`rounded-lg border px-3 py-2 text-sm outline-none ${inputCls}`} />
                <button type="submit" className="rounded-lg px-3 py-2 text-sm font-semibold" style={{ background: accent, color: preset === "athletic" ? "#0a0a0a" : "#fff" }}>
                  Send my details
                </button>
              </form>
            ) : null}
            <div ref={endRef} />
          </div>
          <form onSubmit={onSubmit} className={`flex items-center gap-2 border-t p-3 ${light ? "border-black/10" : "border-white/10"}`}>
            <input name="message" maxLength={1000} autoComplete="off" placeholder="Type your question..." className={`h-11 flex-1 rounded-xl border px-3.5 text-sm outline-none ${inputCls}`} aria-label="Message" />
            <button type="submit" disabled={sending} className="grid size-11 place-items-center rounded-xl disabled:opacity-60" style={{ background: accent, color: preset === "athletic" ? "#0a0a0a" : "#fff" }} aria-label="Send">
              <SendHorizontal size={16} />
            </button>
          </form>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="grid size-14 place-items-center rounded-full shadow-[0_15px_40px_-10px_rgba(0,0,0,0.6)] transition hover:scale-105"
        style={{ background: accent, color: preset === "athletic" ? "#0a0a0a" : "#fff", boxShadow: `0 16px 40px -12px ${accent}` }}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
