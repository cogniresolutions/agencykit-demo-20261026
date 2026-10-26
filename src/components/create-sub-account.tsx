"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { createSubAccountAction } from "@/app/app/actions";
import { Button, Field, Input, Select } from "@/components/ui";
import { INDUSTRIES } from "@/lib/sites/schema";

const SWATCHES = ["#ff6b2c", "#6366f1", "#10b981", "#ec4899", "#0ea5e9", "#f59e0b", "#a855f7", "#ef4444"];

export function CreateSubAccountButton({ autoOpen = false, label = "Create sub-account" }: { autoOpen?: boolean; label?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [color, setColor] = useState(SWATCHES[0]);
  const [state, action, pending] = useActionState(createSubAccountAction, undefined);

  useEffect(() => {
    if (autoOpen) ref.current?.showModal();
  }, [autoOpen]);

  function close() {
    ref.current?.close();
    if (autoOpen) router.replace("/app");
  }

  return (
    <>
      <Button type="button" onClick={() => ref.current?.showModal()}>
        <Plus size={16} />
        {label}
      </Button>
      <dialog
        ref={ref}
        className="m-auto w-[min(520px,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-ink-850 p-0 text-ink-100 shadow-2xl"
        onClose={() => autoOpen && router.replace("/app")}
      >
        <div className="accent-glow pointer-events-none absolute inset-x-0 top-0 h-40" style={{ ["--accent" as string]: color }} />
        <form action={action} className="relative grid gap-5 p-7">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Create sub-account</h2>
              <p className="mt-1 text-sm text-ink-300">Each client gets an isolated workspace with its own leads, pipeline and websites.</p>
            </div>
            <button type="button" onClick={close} className="rounded-lg p-1.5 text-ink-400 hover:bg-white/[0.06] hover:text-white" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          {state?.error ? <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p> : null}
          <Field label="Business name" htmlFor="sub-name">
            <Input id="sub-name" name="name" required minLength={2} maxLength={80} placeholder="Summit Fitness Co." autoFocus />
            {state?.fieldErrors?.name ? <p className="mt-1.5 text-xs text-danger">{state.fieldErrors.name}</p> : null}
          </Field>
          <Field label="Industry" htmlFor="sub-industry">
            <Select id="sub-industry" name="industry" defaultValue="ai_automation">
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Brand color">
            <div className="flex flex-wrap items-center gap-2.5">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="size-8 rounded-full ring-offset-2 ring-offset-ink-850 transition hover:scale-110"
                  style={{ background: c, boxShadow: color === c ? `0 0 0 2px #0e1015, 0 0 0 4px ${c}` : undefined }}
                  aria-label={`Use ${c}`}
                />
              ))}
              <label className="relative ml-1 flex items-center gap-2 text-xs text-ink-400">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="size-8 cursor-pointer" aria-label="Custom color" />
                Custom
              </label>
            </div>
            <input type="hidden" name="brandColor" value={color} />
          </Field>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} style={{ ["--accent" as string]: color }}>
              {pending ? "Creating..." : "Create sub-account"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
