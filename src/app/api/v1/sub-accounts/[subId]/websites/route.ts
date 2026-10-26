import { apiHandler } from "@/lib/api";
import { createWebsite, generateWebsiteSchema } from "@/lib/services";
import { uuidSchema } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: Promise<{ subId: string }> }) {
  const { subId } = await params;
  return apiHandler(
    req,
    async ({ user, ip, body }) => {
      const w = await createWebsite(user, uuidSchema.parse(subId), generateWebsiteSchema.parse(body), ip);
      return { id: w.id, slug: w.slug, generatedBy: w.generatedBy, url: `/s/${w.slug}` };
    },
    { mutation: true },
  );
}
