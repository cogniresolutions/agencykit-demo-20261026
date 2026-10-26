import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { readJsonBody, sameOriginOrNoOrigin } from "@/lib/public-api";
import { ipFromHeaders } from "@/lib/request";
import { ServiceError } from "@/lib/services";
import { TenantAccessError } from "@/lib/tenant";

/**
 * Authenticated JSON API (session cookie). Mutations require
 * Content-Type: application/json and a same-origin (or absent) Origin header,
 * which together with SameSite=Lax cookies blocks cross-site request forgery.
 */
export function apiError(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function apiHandler<T>(
  req: Request,
  fn: (ctx: { user: CurrentUser; ip: string; body: unknown }) => Promise<T>,
  opts: { mutation?: boolean } = {},
) {
  if (opts.mutation && !sameOriginOrNoOrigin(req)) return apiError(403, "Cross-site request blocked");
  const user = await getCurrentUser();
  if (!user) return apiError(401, "Sign in required");
  let body: unknown = null;
  if (opts.mutation) {
    body = await readJsonBody(req);
    if (body === null) return apiError(415, "Send a JSON body with Content-Type: application/json");
  }
  try {
    const data = await fn({ user, ip: ipFromHeaders(req.headers), body });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof TenantAccessError) return apiError(404, "Not found");
    if (err instanceof ServiceError) return apiError(err.status, err.message);
    if ((err as { name?: string }).name === "ZodError") {
      return apiError(400, (err as z.ZodError).issues[0]?.message ?? "Invalid input");
    }
    console.error("[api]", err);
    return apiError(500, "Internal error");
  }
}
