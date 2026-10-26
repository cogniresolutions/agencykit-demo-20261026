import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { setWebsitePublished } from "@/lib/services";
import { uuidSchema } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: Promise<{ subId: string; websiteId: string }> }) {
  const { subId, websiteId } = await params;
  return apiHandler(
    req,
    async ({ user, ip, body }) => {
      const { published } = z.object({ published: z.boolean() }).parse(body);
      return setWebsitePublished(user, uuidSchema.parse(subId), uuidSchema.parse(websiteId), published, ip);
    },
    { mutation: true },
  );
}
