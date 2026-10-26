"use client";

import { SendHorizontal } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { replyAction } from "@/app/app/[sub]/conversations/actions";
import { Button } from "@/components/ui";

export function ReplyBox({ subId, conversationId, channel }: { subId: string; conversationId: string; channel: string }) {
  const [state, action, pending] = useActionState(replyAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="border-t border-white/[0.06] p-4">
      <input type="hidden" name="subId" value={subId} />
      <input type="hidden" name="conversationId" value={conversationId} />
      <div className="glass flex items-end gap-3 rounded-2xl p-2 pl-4 focus-within:border-[var(--accent)]/50">
        <textarea
          name="body"
          required
          maxLength={4000}
          rows={2}
          placeholder="Write a reply..."
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent py-2 text-sm text-ink-100 placeholder:text-ink-400 outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) formRef.current?.requestSubmit();
          }}
        />
        <Button type="submit" disabled={pending} className="h-10 w-10 rounded-xl px-0" aria-label="Send reply">
          <SendHorizontal size={16} />
        </Button>
      </div>
      <p className="mt-2 px-1 text-[11px] text-ink-500">
        {state?.error ? <span className="text-danger">{state.error}</span> : null}
        {!state?.error && (channel === "email" || channel === "sms")
          ? "Replies are saved to the thread. Connect an email or SMS provider to deliver them."
          : !state?.error
            ? "Ctrl + Enter to send"
            : null}
      </p>
    </form>
  );
}
