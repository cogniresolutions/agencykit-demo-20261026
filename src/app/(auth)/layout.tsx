import { Bot, Globe2, KanbanSquare, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";

const features = [
  { icon: Globe2, title: "AI websites in minutes", body: "Generate a branded site with a contact form and chat widget for every client." },
  { icon: KanbanSquare, title: "Leads to revenue", body: "Contacts, pipeline and conversations in one place for each sub-account." },
  { icon: Bot, title: "Speed to lead", body: "An AI assistant answers website visitors instantly and captures their details." },
  { icon: ShieldCheck, title: "Isolation by design", body: "Server-side checks plus Postgres row-level security keep every client separate." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-backdrop relative grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="grid-fade pointer-events-none absolute inset-0" />
      <aside className="relative hidden flex-col justify-between border-r border-white/[0.06] p-12 lg:flex">
        <Logo />
        <div className="max-w-lg animate-fade-up">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-accent">Self-hosted agency platform</p>
          <h2 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-white">
            Run every client
            <br />
            <span className="bg-gradient-to-r from-[#ffb08a] via-[#ff6b2c] to-[#ff4d1a] bg-clip-text text-transparent">from one place.</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-300">
            Sub-accounts, leads, pipeline, conversations and AI-generated websites. Your server, your data, your brand.
          </p>
          <ul className="mt-10 grid gap-5">
            {features.map((f) => (
              <li key={f.title} className="flex gap-4">
                <span className="glass grid size-10 shrink-0 place-items-center rounded-xl text-accent">
                  <f.icon size={18} />
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{f.title}</p>
                  <p className="text-sm text-ink-400">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-ink-500">MIT licensed · Built by Sas Mohanty</p>
      </aside>
      <main className="relative flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[420px] animate-fade-up">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
