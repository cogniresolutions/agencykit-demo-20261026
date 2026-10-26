"use client";

import {
  Building2,
  Check,
  ChevronsUpDown,
  Globe2,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Plus,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { Avatar, cx } from "@/components/ui";

type SubLite = { id: string; name: string; slug: string; brandColor: string; industry: string };

const subNav = [
  { href: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "contacts", label: "Contacts", icon: Users },
  { href: "pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "conversations", label: "Conversations", icon: MessagesSquare },
  { href: "websites", label: "Websites", icon: Globe2 },
  { href: "audit", label: "Audit log", icon: ScrollText },
  { href: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  subAccounts,
  user,
  agencyName,
  canManage,
}: {
  subAccounts: SubLite[];
  user: { name: string; email: string; role: string };
  agencyName: string;
  canManage: boolean;
}) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[1] && segments[1] !== "admin" ? segments[1] : null;
  const current = subAccounts.find((s) => s.slug === slug) ?? null;
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const linkClass = (active: boolean) =>
    cx(
      "group flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors",
      active ? "bg-white/[0.07] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" : "text-ink-300 hover:bg-white/[0.04] hover:text-white",
    );

  return (
    <aside className="sticky top-0 flex h-screen w-[264px] shrink-0 flex-col border-r border-white/[0.06] bg-ink-900/70 backdrop-blur-xl">
      <div className="flex h-16 items-center px-5">
        <Link href="/app" aria-label="Agency home">
          <Logo />
        </Link>
      </div>

      <div className="relative px-3" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="glass flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {current ? (
            <Avatar name={current.name} color={current.brandColor} size={30} />
          ) : (
            <span className="grid size-[30px] place-items-center rounded-full bg-white/[0.08] text-ink-200">
              <Building2 size={15} />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-white">{current ? current.name : agencyName}</span>
            <span className="block truncate text-[11px] text-ink-400">{current ? "Sub-account" : "Agency view"}</span>
          </span>
          <ChevronsUpDown size={15} className="text-ink-400" />
        </button>
        {open ? (
          <div className="glass absolute inset-x-3 top-full z-50 mt-2 overflow-hidden rounded-xl bg-ink-800/95 p-1.5 shadow-2xl">
            <Link
              href="/app"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-ink-200 hover:bg-white/[0.06]"
            >
              <Building2 size={15} className="text-ink-400" />
              <span className="flex-1 truncate">{agencyName}</span>
              {!current ? <Check size={14} className="text-accent" /> : null}
            </Link>
            {subAccounts.length ? <div className="my-1 h-px bg-white/[0.06]" /> : null}
            <div className="scrollbar-thin max-h-64 overflow-y-auto">
              {subAccounts.map((s) => (
                <Link
                  key={s.id}
                  href={`/app/${s.slug}/dashboard`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-ink-200 hover:bg-white/[0.06]"
                >
                  <span className="size-2.5 rounded-full" style={{ background: s.brandColor }} />
                  <span className="flex-1 truncate">{s.name}</span>
                  {current?.id === s.id ? <Check size={14} className="text-accent" /> : null}
                </Link>
              ))}
            </div>
            {canManage ? (
              <>
                <div className="my-1 h-px bg-white/[0.06]" />
                <Link
                  href="/app?create=1"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-accent hover:bg-white/[0.06]"
                >
                  <Plus size={15} />
                  Create sub-account
                </Link>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <nav className="scrollbar-thin mt-6 flex-1 overflow-y-auto px-3">
        {current ? (
          <>
            <p className="px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-500">Workspace</p>
            <ul className="grid gap-0.5">
              {subNav.map((item) => {
                const href = `/app/${current.slug}/${item.href}`;
                const active = pathname.startsWith(href);
                return (
                  <li key={item.href}>
                    <Link href={href} className={linkClass(active)}>
                      <item.icon size={17} className={active ? "text-accent" : "text-ink-400 group-hover:text-ink-200"} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
        <p className={cx("px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-500", current ? "mt-7" : "")}>Agency</p>
        <ul className="grid gap-0.5">
          <li>
            <Link href="/app" className={linkClass(pathname === "/app")}>
              <Building2 size={17} className={pathname === "/app" ? "text-accent" : "text-ink-400"} />
              Sub-accounts
            </Link>
          </li>
          {canManage ? (
            <li>
              <Link href="/app/admin/security" className={linkClass(pathname.startsWith("/app/admin/security"))}>
                <ShieldCheck size={17} className={pathname.startsWith("/app/admin/security") ? "text-accent" : "text-ink-400"} />
                Security check
              </Link>
            </li>
          ) : null}
        </ul>
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar name={user.name} color="#6366f1" size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white">{user.name}</p>
            <p className="truncate text-[11px] capitalize text-ink-400">{user.role}</p>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-white/[0.06] hover:text-white" aria-label="Sign out" title="Sign out">
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
