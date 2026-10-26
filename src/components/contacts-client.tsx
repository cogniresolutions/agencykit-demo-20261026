"use client";

import { FileUp, Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { addContactAction, importContactsAction } from "@/app/app/[sub]/contacts/actions";
import { FormMessage, Modal } from "@/components/modal";
import { Button, Field, Input, Select } from "@/components/ui";

export function ContactSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set("q", value);
      else next.delete("q");
      if (next.toString() !== params.toString()) startTransition(() => router.replace(`${pathname}?${next.toString()}`));
    }, 250);
    return () => clearTimeout(t);
  }, [value, params, pathname, router]);

  return (
    <div className="relative w-full max-w-sm">
      <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Search name, email, phone or tag" className="pl-10" aria-label="Search contacts" />
    </div>
  );
}

export function AddContact({ subId }: { subId: string }) {
  const [state, action, pending] = useActionState(addContactAction, undefined);
  return (
    <Modal
      title="Add contact"
      description="Create a lead manually. It appears in this sub-account only."
      trigger={
        <>
          <Plus size={16} /> Add contact
        </>
      }
    >
      {(close) => (
        <form action={action} className="grid gap-4">
          <FormMessage state={state} />
          <input type="hidden" name="subId" value={subId} />
          <Field label="Full name" htmlFor="c-name">
            <Input id="c-name" name="name" required maxLength={120} placeholder="Jordan Lee" />
            {state?.fieldErrors?.name ? <p className="mt-1 text-xs text-danger">{state.fieldErrors.name}</p> : null}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="c-email">
              <Input id="c-email" name="email" type="email" placeholder="jordan@example.com" />
              {state?.fieldErrors?.email ? <p className="mt-1 text-xs text-danger">{state.fieldErrors.email}</p> : null}
            </Field>
            <Field label="Phone" htmlFor="c-phone">
              <Input id="c-phone" name="phone" placeholder="+1 555 0100" />
              {state?.fieldErrors?.phone ? <p className="mt-1 text-xs text-danger">{state.fieldErrors.phone}</p> : null}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Source" htmlFor="c-source">
              <Select id="c-source" name="source" defaultValue="manual">
                <option value="manual">Manual</option>
                <option value="referral">Referral</option>
                <option value="walk-in">Walk-in</option>
                <option value="phone call">Phone call</option>
                <option value="google ads">Google Ads</option>
                <option value="facebook ads">Facebook Ads</option>
              </Select>
            </Field>
            <Field label="Stage" htmlFor="c-stage">
              <Select id="c-stage" name="stage" defaultValue="new">
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="customer">Customer</option>
                <option value="lost">Lost</option>
              </Select>
            </Field>
          </div>
          <Field label="Tags" htmlFor="c-tags" hint="Comma separated, e.g. vip, newsletter">
            <Input id="c-tags" name="tags" placeholder="vip, newsletter" />
          </Field>
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={close}>
              Close
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save contact"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function ImportContacts({ subId }: { subId: string }) {
  const [state, action, pending] = useActionState(importContactsAction, undefined);
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    setError("");
    if (!file) return;
    if (file.size > 1_000_000) {
      setError("Max file size is 1 MB.");
      return;
    }
    setFileName(file.name);
    setCsv(await file.text());
  }

  return (
    <Modal
      triggerVariant="secondary"
      title="Import contacts from CSV"
      description="Columns: name, email, phone, source, tags (use ; between tags). Duplicates by email are skipped."
      trigger={
        <>
          <FileUp size={16} /> Import CSV
        </>
      }
    >
      {(close) => (
        <form action={action} className="grid gap-4">
          <FormMessage state={state} />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <input type="hidden" name="subId" value={subId} />
          <input type="hidden" name="csv" value={csv} />
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10 text-center transition hover:border-[var(--accent)]/60 hover:bg-white/[0.04]">
            <FileUp size={22} className="mb-3 text-accent" />
            <span className="text-sm font-medium text-white">{fileName || "Choose a .csv file"}</span>
            <span className="mt-1 text-xs text-ink-400">Up to 5,000 rows, 1 MB</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={close}>
              Close
            </Button>
            <Button type="submit" disabled={pending || !csv}>
              {pending ? "Importing..." : "Import contacts"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
