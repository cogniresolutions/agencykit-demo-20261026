import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cx("glass rounded-2xl", className)} {...rest}>
      {children}
    </div>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";
const buttonVariants = {
  primary:
    "bg-accent text-white shadow-[0_8px_24px_-8px_var(--accent)] hover:brightness-110 active:brightness-95 px-4 h-10",
  secondary: "bg-white/[0.06] text-ink-100 border border-white/10 hover:bg-white/[0.1] px-4 h-10",
  ghost: "text-ink-300 hover:text-white hover:bg-white/[0.06] px-3 h-9",
  danger: "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 px-4 h-10",
} as const;
export type ButtonVariant = keyof typeof buttonVariants;

export function buttonClass(variant: ButtonVariant = "primary", className?: string) {
  return cx(buttonBase, buttonVariants[variant], className);
}

export function Button({
  variant = "primary",
  className,
  ...rest
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...rest} />;
}

export function LinkButton({
  variant = "primary",
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClass(variant, className)} {...rest} />;
}

export const inputClass =
  "w-full h-10 rounded-xl bg-ink-900/80 border border-white/10 px-3.5 text-sm text-ink-100 placeholder:text-ink-400 outline-none transition focus:border-[var(--accent)]/70 focus:ring-4 focus:ring-[var(--accent)]/15";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cx(inputClass, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cx(inputClass, "h-auto min-h-24 py-2.5 leading-relaxed", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select
      className={cx(
        inputClass,
        "appearance-none pr-9 bg-[length:16px] bg-no-repeat bg-[right_0.75rem_center] bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239aa0ad%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')]",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...rest }: ComponentProps<"label">) {
  return <label className={cx("mb-1.5 block text-xs font-medium tracking-wide text-ink-300", className)} {...rest} />;
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}

const badgeTones = {
  neutral: "bg-white/[0.06] text-ink-200 border-white/10",
  accent: "bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] text-[color-mix(in_oklab,var(--accent)_70%,white)] border-[color-mix(in_oklab,var(--accent)_35%,transparent)]",
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger: "bg-danger/10 text-danger border-danger/25",
} as const;

export function Badge({ tone = "neutral", className, children }: { tone?: keyof typeof badgeTones; className?: string; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", badgeTones[tone], className)}>
      {children}
    </span>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: string; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div>
        {eyebrow ? <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-accent">{eyebrow}</p> : null}
        <h1 className="text-[28px] font-semibold tracking-tight text-white">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-ink-300">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon ? (
        <div className="mb-4 grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-accent">{icon}</div>
      ) : null}
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-300">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </Card>
  );
}

export function Avatar({ name, color, size = 32 }: { name: string; color?: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, ${color ?? "var(--accent)"}, color-mix(in oklab, ${color ?? "var(--accent)"} 45%, #1b1e27))`,
      }}
    >
      {initials || "?"}
    </span>
  );
}
