"use client";

import { X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui";

/** Native <dialog> modal with a trigger button. */
export function Modal({
  trigger,
  triggerVariant = "primary",
  title,
  description,
  children,
  width = 520,
}: {
  trigger: ReactNode;
  triggerVariant?: ButtonVariant;
  title: string;
  description?: string;
  children: (close: () => void) => ReactNode;
  width?: number;
}) {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
  const close = () => dialog?.close();
  return (
    <>
      <Button type="button" variant={triggerVariant} onClick={() => dialog?.showModal()}>
        {trigger}
      </Button>
      <dialog
        ref={setDialog}
        className="m-auto rounded-2xl border border-white/10 bg-ink-850 p-0 text-ink-100 shadow-2xl"
        style={{ width: `min(${width}px, calc(100vw - 2rem))` }}
      >
        <div className="accent-glow pointer-events-none absolute inset-x-0 top-0 h-32" />
        <div className="relative p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              {description ? <p className="mt-1 text-sm text-ink-300">{description}</p> : null}
            </div>
            <button type="button" onClick={close} className="rounded-lg p-1.5 text-ink-400 hover:bg-white/[0.06] hover:text-white" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          {children(close)}
        </div>
      </dialog>
    </>
  );
}

export function FormMessage({ state }: { state: { ok?: boolean; error?: string; message?: string } | undefined }) {
  if (state?.error) return <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>;
  if (state?.ok && state.message) return <p className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">{state.message}</p>;
  return null;
}
