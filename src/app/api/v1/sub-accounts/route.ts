import { apiHandler } from "@/lib/api";
import { createSubAccount, createSubAccountSchema } from "@/lib/services";
import { listAccessibleSubAccounts } from "@/lib/tenant";

export async function GET(req: Request) {
  return apiHandler(req, async ({ user }) => ({
    subAccounts: (await listAccessibleSubAccounts(user)).map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      industry: s.industry,
      brandColor: s.brandColor,
    })),
  }));
}

export async function POST(req: Request) {
  return apiHandler(
    req,
    async ({ user, ip, body }) => {
      const sub = await createSubAccount(user, createSubAccountSchema.parse(body), ip);
      return { id: sub.id, slug: sub.slug, name: sub.name };
    },
    { mutation: true },
  );
}
