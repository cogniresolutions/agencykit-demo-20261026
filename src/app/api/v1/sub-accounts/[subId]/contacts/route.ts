import { desc, eq } from "drizzle-orm";
import { contacts } from "@/db/schema";
import { apiHandler } from "@/lib/api";
import { withTenant } from "@/lib/tenant";
import { uuidSchema } from "@/lib/validation";

export async function GET(req: Request, { params }: { params: Promise<{ subId: string }> }) {
  const { subId } = await params;
  return apiHandler(req, async ({ user }) =>
    withTenant(user, uuidSchema.parse(subId), async (tx, ctx) => ({
      contacts: await tx
        .select({
          id: contacts.id,
          name: contacts.name,
          email: contacts.email,
          phone: contacts.phone,
          source: contacts.source,
          tags: contacts.tags,
          stage: contacts.stage,
          createdAt: contacts.createdAt,
        })
        .from(contacts)
        .where(eq(contacts.subAccountId, ctx.subAccount.id))
        .orderBy(desc(contacts.createdAt))
        .limit(100),
    })),
  );
}
