"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { clientIp } from "@/lib/request";
import { ServiceError, createSubAccount, createSubAccountSchema } from "@/lib/services";
import { fieldErrors, type FormState } from "@/lib/validation";

export async function createSubAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = createSubAccountSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry"),
    brandColor: formData.get("brandColor"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  let slug: string;
  try {
    slug = (await createSubAccount(user, parsed.data, await clientIp())).slug;
  } catch (err) {
    if (err instanceof ServiceError) return { error: err.message };
    throw err;
  }
  redirect(`/app/${slug}/dashboard`);
}
