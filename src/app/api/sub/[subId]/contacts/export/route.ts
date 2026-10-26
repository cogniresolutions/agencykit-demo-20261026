import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { contacts } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { clientIp } from "@/lib/request";
import { TenantAccessError, withTenant } from "@/lib/tenant";

export async function GET(_req: Request, { params }: { params: Promise<{ subId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { subId } = await params;
  const ip = await clientIp();
  try {
    const { csv, slug } = await withTenant(user, subId, async (tx, ctx) => {
      const rows = await tx
        .select()
        .from(contacts)
        .where(eq(contacts.subAccountId, ctx.subAccount.id))
        .orderBy(desc(contacts.createdAt))
        .limit(50_000);
      await audit(tx, {
        agencyId: user.agencyId,
        subAccountId: ctx.subAccount.id,
        actor: user.email,
        actorUserId: user.id,
        action: "contact.exported",
        entity: "contact",
        ip,
        metadata: { rows: rows.length },
      });
      return {
        slug: ctx.subAccount.slug,
        csv: toCsv([
          ["name", "email", "phone", "source", "tags", "stage", "created_at"],
          ...rows.map((r) => [r.name, r.email, r.phone, r.source, r.tags.join(";"), r.stage, r.createdAt.toISOString()]),
        ]),
      };
    });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}-contacts.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof TenantAccessError) return NextResponse.json({ error: "Not found" }, { status: 404 });
    throw err;
  }
}
