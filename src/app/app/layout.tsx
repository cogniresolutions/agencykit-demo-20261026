import { Sidebar } from "@/components/sidebar";
import { isAgencyAdmin, requireUser } from "@/lib/auth";
import { listAccessibleSubAccounts } from "@/lib/tenant";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const subs = await listAccessibleSubAccounts(user);
  return (
    <div className="app-backdrop flex min-h-screen">
      <Sidebar
        subAccounts={subs.map((s) => ({ id: s.id, name: s.name, slug: s.slug, brandColor: s.brandColor, industry: s.industry }))}
        user={{ name: user.name, email: user.email, role: user.role }}
        agencyName={user.agencyName}
        canManage={isAgencyAdmin(user)}
      />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
