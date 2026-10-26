import { eq } from "drizzle-orm";
import { X } from "lucide-react";
import type { Metadata } from "next";
import { AddMemberForm, BrandForm, DangerZone, WidgetKeyForm } from "@/components/settings-client";
import { Avatar, Badge, Card, PageHeader } from "@/components/ui";
import { memberships, users } from "@/db/schema";
import { isAgencyAdmin } from "@/lib/auth";
import { tenantPage } from "@/lib/page-tenant";
import { removeMemberAction } from "./actions";

export const metadata: Metadata = { title: "Settings" };

function Section({ title, description, children, danger }: { title: string; description: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <Card className={`grid gap-6 p-6 md:grid-cols-[260px_1fr] ${danger ? "border-danger/25" : ""}`}>
      <div>
        <h2 className={`text-sm font-semibold ${danger ? "text-danger" : "text-white"}`}>{title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-400">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </Card>
  );
}

export default async function SettingsPage({ params }: { params: Promise<{ sub: string }> }) {
  const { sub } = await params;
  const data = await tenantPage(sub, async (tx, ctx, user) => {
    const agencyStaff = await tx
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.agencyId, user.agencyId));
    const members = await tx
      .select({ userId: memberships.userId, role: memberships.role })
      .from(memberships)
      .where(eq(memberships.subAccountId, ctx.subAccount.id));
    return { agencyStaff, members, subAccount: ctx.subAccount, role: ctx.role, user };
  });
  const { subAccount, user } = data;
  const canAdmin = isAgencyAdmin(user);
  const memberRole = new Map(data.members.map((m) => [m.userId, m.role]));
  const people = data.agencyStaff
    .filter((u) => u.role !== "member" || memberRole.has(u.id))
    .map((u) => ({ ...u, access: u.role === "member" ? memberRole.get(u.id)! : "agency " + u.role }));

  return (
    <div className="mx-auto max-w-[1100px] px-10 py-10">
      <PageHeader eyebrow={subAccount.name} title="Settings" description="Branding, team access, API keys and lifecycle for this sub-account." />
      <div className="grid gap-4">
        <Section title="Branding" description="The brand color is used as the accent across this workspace and on newly generated websites.">
          <BrandForm subId={subAccount.id} name={subAccount.name} brandColor={subAccount.brandColor} canEdit={data.role === "admin"} />
        </Section>

        <Section title="Members & roles" description="Agency owners and admins can access every sub-account. Members only see sub-accounts they are added to.">
          <ul className="divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.06]">
            {people.map((p) => (
              <li key={p.id} className="flex items-center gap-3 bg-white/[0.01] px-4 py-3">
                <Avatar name={p.name} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{p.name}</p>
                  <p className="truncate text-xs text-ink-400">{p.email}</p>
                </div>
                <Badge tone={p.access.startsWith("agency") ? "accent" : "neutral"}>{p.access}</Badge>
                {canAdmin && p.role === "member" ? (
                  <form action={removeMemberAction}>
                    <input type="hidden" name="subId" value={subAccount.id} />
                    <input type="hidden" name="userId" value={p.id} />
                    <button type="submit" className="rounded-lg p-1.5 text-ink-500 hover:bg-danger/10 hover:text-danger" aria-label={`Remove ${p.name}`}>
                      <X size={14} />
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
          {canAdmin ? (
            <div className="mt-5">
              <AddMemberForm subId={subAccount.id} />
            </div>
          ) : null}
        </Section>

        <Section
          title="Chat widget API key"
          description="Lets an external site call POST /api/public/chat with the x-widget-key header. Only a SHA-256 hash is stored, so the key is shown once."
        >
          <WidgetKeyForm subId={subAccount.id} prefix={subAccount.widgetKeyPrefix} canEdit={data.role === "admin"} />
        </Section>

        {canAdmin ? (
          <Section danger title="Danger zone" description="Deleting a sub-account cannot be undone.">
            <DangerZone subId={subAccount.id} slug={subAccount.slug} />
          </Section>
        ) : null}
      </div>
    </div>
  );
}
