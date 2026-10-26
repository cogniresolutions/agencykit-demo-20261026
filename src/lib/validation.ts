import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address").max(254));

export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128, "Use at most 128 characters");

export const nameSchema = z.string().trim().min(1, "Required").max(100);

export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid color");

export const uuidSchema = z.uuid();

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string>; message?: string } | undefined;

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function slugify(input: string, max = 40) {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max)
      .replace(/-+$/g, "") || "site"
  );
}

export const RESERVED_SLUGS = new Set(["admin", "new", "api", "settings", "security", "login", "signup"]);
