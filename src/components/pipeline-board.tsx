"use client";

import { GripVertical, Plus } from "lucide-react";
import { useActionState, useOptimistic, useState, useTransition } from "react";
import { addDealAction, moveDealAction } from "@/app/app/[sub]/pipeline/actions";
import { FormMessage, Modal } from "@/components/modal";
import { Avatar, Button, Field, Input, Select, cx } from "@/components/ui";

type Stage = { id: string; name: string; isWon: boolean };
type Deal = { id: string; title: string; valueCents: number; stageId: string; contactName: string | null; updatedAt: string };

const usd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

export function PipelineBoard({ subId, stages, deals }: { subId: string; stages: Stage[]; deals: Deal[] }) {
  const [optimistic, applyMove] = useOptimistic(deals, (state, move: { dealId: string; stageId: string }) =>
    state.map((d) => (d.id === move.dealId ? { ...d, stageId: move.stageId } : d)),
  );
  const [, startTransition] = useTransition();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState("");

  function drop(stageId: string, dealId: string) {
    setOver(null);
    setDragging(null);
    const deal = optimistic.find((d) => d.id === dealId);
    if (!deal || deal.stageId === stageId) return;
    startTransition(async () => {
      applyMove({ dealId, stageId });
      try {
        await moveDealAction({ subId, dealId, stageId });
        setError("");
      } catch {
        setError("Could not move the deal. Please try again.");
      }
    });
  }

  return (
    <>
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      <div className="scrollbar-thin -mx-2 flex gap-4 overflow-x-auto px-2 pb-4">
        {stages.map((stage) => {
          const items = optimistic.filter((d) => d.stageId === stage.id);
          const total = items.reduce((a, d) => a + d.valueCents, 0);
          return (
            <section
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOver(stage.id);
              }}
              onDragLeave={() => setOver((o) => (o === stage.id ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                drop(stage.id, e.dataTransfer.getData("text/deal-id"));
              }}
              className={cx(
                "flex min-w-[232px] flex-1 flex-col rounded-2xl border bg-white/[0.02] transition-colors",
                over === stage.id ? "border-[var(--accent)]/60 bg-white/[0.04]" : "border-white/[0.06]",
              )}
              aria-label={`${stage.name} stage`}
            >
              <header className="flex items-center justify-between px-4 pb-3 pt-4">
                <div className="flex items-center gap-2">
                  <span className={cx("size-2 rounded-full", stage.isWon ? "bg-success" : "bg-accent")} />
                  <h3 className="text-[13px] font-semibold text-white">{stage.name}</h3>
                  <span className="rounded-full bg-white/[0.06] px-1.5 text-[11px] text-ink-300">{items.length}</span>
                </div>
                <span className="text-xs font-medium text-ink-300">{usd(total)}</span>
              </header>
              <div className="flex min-h-40 flex-1 flex-col gap-2.5 px-3 pb-3">
                {items.map((d) => (
                  <article
                    key={d.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/deal-id", d.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragging(d.id);
                    }}
                    onDragEnd={() => setDragging(null)}
                    className={cx(
                      "glass group cursor-grab rounded-xl p-3.5 transition active:cursor-grabbing hover:border-white/15",
                      dragging === d.id && "opacity-40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-medium leading-snug text-white">{d.title}</p>
                      <GripVertical size={14} className="mt-0.5 shrink-0 text-ink-500 opacity-0 transition group-hover:opacity-100" />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      {d.contactName ? (
                        <span className="flex min-w-0 items-center gap-1.5 text-xs text-ink-400">
                          <Avatar name={d.contactName} size={20} />
                          <span className="truncate">{d.contactName}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-ink-500">No contact</span>
                      )}
                      <span className="text-[13px] font-semibold text-white">{usd(d.valueCents)}</span>
                    </div>
                  </article>
                ))}
                {items.length === 0 ? (
                  <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-white/[0.08] text-xs text-ink-500">Drop deals here</div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

export function AddDeal({ subId, stages, contacts }: { subId: string; stages: Stage[]; contacts: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(addDealAction, undefined);
  return (
    <Modal
      title="New deal"
      description="Track an opportunity through your pipeline."
      trigger={
        <>
          <Plus size={16} /> New deal
        </>
      }
    >
      {(close) => (
        <form action={action} className="grid gap-4">
          <FormMessage state={state} />
          <input type="hidden" name="subId" value={subId} />
          <Field label="Deal title" htmlFor="d-title">
            <Input id="d-title" name="title" required maxLength={120} placeholder="Annual membership" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Value (USD)" htmlFor="d-value">
              <Input id="d-value" name="value" type="number" min={0} step="1" defaultValue={1000} />
            </Field>
            <Field label="Stage" htmlFor="d-stage">
              <Select id="d-stage" name="stageId" defaultValue={stages[0]?.id}>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Contact" htmlFor="d-contact">
            <Select id="d-contact" name="contactId" defaultValue="">
              <option value="">No contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={close}>
              Close
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Create deal"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
