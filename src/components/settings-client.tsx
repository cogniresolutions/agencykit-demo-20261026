"use client";

import { Copy, KeyRound, UserPlus } from "lucide-react";
import { useActionState, useState } from "react";
import { addMemberAction, deleteSubAccountAction, rotateWidgetKeyAction, updateBrandAction } from "@/app/app/[sub]/settings/actions";
import { FormMessage } from "@/components/modal";
import { Button, Field, Input, Select } from "@/components/ui";

export function BrandForm({ subId, name, brandColor, canEdit }: { subId: string; name: string; brandColor: string; canEdit: boolean }) {
  const [state, action, pending] = useActionState(updateBrandAction, undefined);
  const [color, setColor] = useState(brandColor);
  return (
    <form action={action} className="grid gap-4">
      <FormMessage state={state} />
      <input type="hidden" name="subId" value={subId} />
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="Sub-account name" htmlFor="s-name">
          <Input id="s-name" name="name" defaultValue={name} disabled={!canEdit} maxLength={80} />
        </Field>
        <Field label="Brand color">
          <div className="flex h-10 items-center gap-3 rounded-xl border border-white/10 bg-ink-900/80 px-2">
            <input type="color" name="brandColor" value={color} onChange={(e) => setColor(e.target.value)} disabled={!canEdit} className="size-7 cursor-pointer" aria-label="Brand color" />
            <span className="pr-2 font-mono text-xs text-ink-300">{color}</span>
          </div>
        </Field>
      </div>
      {canEdit ? (
        <div>
          <Button type="submit" disabled={pending} style={{ ["--accent" as string]: color }}>
            {pending ? "Saving..." : "Save branding"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

export function AddMemberForm({ subId }: { subId: string }) {
  const [state, action, pending] = useActionState(addMemberAction, undefined);
  return (
    <form action={action} className="grid gap-3">
      <FormMessage state={state} />
      <input type="hidden" name="subId" value={subId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_1.3fr_140px_auto]">
        <Input name="name" placeholder="Full name" required maxLength={100} aria-label="Full name" />
        <Input name="email" type="email" placeholder="teammate@agency.com" required aria-label="Email" />
        <Select name="role" defaultValue="member" aria-label="Role">
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </Select>
        <Button type="submit" disabled={pending}>
          <UserPlus size={15} /> Add
        </Button>
      </div>
      {state?.fieldErrors ? <p className="text-xs text-danger">{Object.values(state.fieldErrors)[0]}</p> : null}
    </form>
  );
}

export function WidgetKeyForm({ subId, prefix, canEdit }: { subId: string; prefix: string | null; canEdit: boolean }) {
  const [state, action, pending] = useActionState(rotateWidgetKeyAction, undefined);
  const [copied, setCopied] = useState(false);
  const key = state && "key" in state ? state.key : undefined;
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="subId" value={subId} />
      {key ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
          <p className="text-xs font-medium text-warning">Copy this key now. It will not be shown again.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-black/40 px-3 py-2 font-mono text-xs text-white">{key}</code>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(key);
                setCopied(true);
              }}
            >
              <Copy size={14} /> {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
          <KeyRound size={16} className="text-ink-400" />
          <code className="flex-1 font-mono text-xs text-ink-300">{prefix ? `${prefix}••••••••••••••••` : "No key yet"}</code>
        </div>
      )}
      {state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      {canEdit ? (
        <div>
          <Button type="submit" variant="secondary" disabled={pending}>
            {prefix ? "Rotate key" : "Generate key"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

export function DangerZone({ subId, slug }: { subId: string; slug: string }) {
  const [state, action, pending] = useActionState(deleteSubAccountAction, undefined);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="subId" value={subId} />
      <p className="text-sm text-ink-300">
        Permanently deletes this sub-account with all contacts, deals, conversations and websites. Type <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white">{slug}</code> to confirm.
      </p>
      <div className="flex gap-3">
        <Input name="confirm" placeholder={slug} autoComplete="off" aria-label="Confirm slug" className="max-w-xs" />
        <Button type="submit" variant="danger" disabled={pending}>
          Delete sub-account
        </Button>
      </div>
      {state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}
