import { getTenant } from "@/lib/page-tenant";

export default async function SubAccountLayout({ children, params }: { children: React.ReactNode; params: Promise<{ sub: string }> }) {
  const { sub } = await params;
  const { subAccount } = await getTenant(sub);
  return (
    <div style={{ ["--accent" as string]: subAccount.brandColor }} className="min-h-screen">
      {children}
    </div>
  );
}
