import { and, asc, desc, eq } from "drizzle-orm";
import { Bot, FileText, Mail, MessageCircle, MessagesSquare, Smartphone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ReplyBox } from "@/components/reply-box";
import { Avatar, Badge, Card, EmptyState, PageHeader, cx } from "@/components/ui";
import { contacts, conversations, messages } from "@/db/schema";
import { CHANNEL_LABELS, dateTime, relativeTime } from "@/lib/format";
import { tenantPage } from "@/lib/page-tenant";
import { toggleConversationStatusAction } from "./actions";

export const metadata: Metadata = { title: "Conversations" };

const channelIcon = { web_chat: MessageCircle, form: FileText, email: Mail, sms: Smartphone } as const;

export default async function ConversationsPage({ params, searchParams }: { params: Promise<{ sub: string }>; searchParams: Promise<{ c?: string }> }) {
  const { sub } = await params;
  const { c } = await searchParams;

  const data = await tenantPage(sub, async (tx, ctx) => {
    const id = ctx.subAccount.id;
    const list = await tx
      .select({ convo: conversations, contactName: contacts.name, contactEmail: contacts.email })
      .from(conversations)
      .leftJoin(contacts, eq(contacts.id, conversations.contactId))
      .where(eq(conversations.subAccountId, id))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(100);
    const activeId = list.find((l) => l.convo.id === c)?.convo.id ?? list[0]?.convo.id;
    let thread: (typeof messages.$inferSelect)[] = [];
    const previews = new Map<string, string>();
    if (list.length) {
      const lastMessages = await tx
        .selectDistinctOn([messages.conversationId], { conversationId: messages.conversationId, body: messages.body })
        .from(messages)
        .where(eq(messages.subAccountId, id))
        .orderBy(messages.conversationId, desc(messages.createdAt));
      for (const m of lastMessages) previews.set(m.conversationId, m.body);
    }
    if (activeId) {
      thread = await tx
        .select()
        .from(messages)
        .where(and(eq(messages.subAccountId, id), eq(messages.conversationId, activeId)))
        .orderBy(asc(messages.createdAt))
        .limit(500);
      await tx.update(conversations).set({ unread: false }).where(and(eq(conversations.id, activeId), eq(conversations.subAccountId, id)));
    }
    return { list, activeId, thread, previews, subAccount: ctx.subAccount };
  });

  const active = data.list.find((l) => l.convo.id === data.activeId);

  return (
    <div className="mx-auto max-w-[1400px] px-10 py-10">
      <PageHeader eyebrow={data.subAccount.name} title="Conversations" description="Every form submission, chat and message in one inbox." />
      {data.list.length === 0 ? (
        <EmptyState icon={<MessagesSquare size={20} />} title="Inbox zero" body="Conversations from your website form and AI chat widget will appear here." />
      ) : (
        <Card className="grid h-[calc(100vh-220px)] min-h-[520px] grid-cols-[340px_1fr] overflow-hidden">
          <ul className="scrollbar-thin overflow-y-auto border-r border-white/[0.06]">
            {data.list.map(({ convo, contactName }) => {
              const Icon = channelIcon[convo.channel];
              const isActive = convo.id === data.activeId;
              return (
                <li key={convo.id}>
                  <Link
                    href={`?c=${convo.id}`}
                    scroll={false}
                    className={cx(
                      "flex gap-3 border-b border-white/[0.04] px-4 py-3.5 transition",
                      isActive ? "bg-white/[0.06]" : "hover:bg-white/[0.03]",
                    )}
                  >
                    <div className="relative">
                      <Avatar name={contactName ?? "Visitor"} size={36} />
                      <span className="absolute -bottom-1 -right-1 grid size-[18px] place-items-center rounded-full border-2 border-ink-900 bg-ink-700 text-ink-200">
                        <Icon size={9} />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cx("truncate text-[13px]", convo.unread ? "font-semibold text-white" : "font-medium text-ink-200")}>
                          {contactName ?? "Website visitor"}
                        </p>
                        <span className="shrink-0 text-[11px] text-ink-500">{relativeTime(convo.lastMessageAt)}</span>
                      </div>
                      <p className="truncate text-xs text-ink-400">{data.previews.get(convo.id) ?? convo.subject}</p>
                    </div>
                    {convo.unread && !isActive ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
          {active ? (
            <section className="flex min-h-0 flex-col">
              <header className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
                <div className="flex items-center gap-3">
                  <Avatar name={active.contactName ?? "Visitor"} size={38} />
                  <div>
                    <p className="text-sm font-semibold text-white">{active.contactName ?? "Website visitor"}</p>
                    <p className="text-xs text-ink-400">
                      {active.contactEmail ?? "No email captured yet"} · {active.convo.subject || CHANNEL_LABELS[active.convo.channel]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="accent">{CHANNEL_LABELS[active.convo.channel]}</Badge>
                  <form action={toggleConversationStatusAction}>
                    <input type="hidden" name="subId" value={data.subAccount.id} />
                    <input type="hidden" name="conversationId" value={active.convo.id} />
                    <input type="hidden" name="status" value={active.convo.status === "open" ? "closed" : "open"} />
                    <button type="submit" className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-ink-300 hover:bg-white/[0.06] hover:text-white">
                      {active.convo.status === "open" ? "Mark closed" : "Reopen"}
                    </button>
                  </form>
                </div>
              </header>
              <div className="scrollbar-thin flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
                {data.thread.map((m) => {
                  const outbound = m.direction === "outbound";
                  return (
                    <div key={m.id} className={cx("flex max-w-[72%] flex-col", outbound ? "items-end self-end" : "items-start")}>
                      <div
                        className={cx(
                          "whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed",
                          outbound ? "rounded-br-md bg-accent text-white" : "rounded-bl-md border border-white/[0.07] bg-white/[0.05] text-ink-100",
                        )}
                      >
                        {m.body}
                      </div>
                      <span className="mt-1 flex items-center gap-1 text-[11px] text-ink-500">
                        {m.author === "ai" ? (
                          <>
                            <Bot size={11} /> AI assistant ·
                          </>
                        ) : m.author === "team" ? (
                          "Team ·"
                        ) : null}{" "}
                        {dateTime(m.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <ReplyBox subId={data.subAccount.id} conversationId={active.convo.id} channel={active.convo.channel} />
            </section>
          ) : null}
        </Card>
      )}
    </div>
  );
}
