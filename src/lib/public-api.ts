import "server-only";
import { NextResponse } from "next/server";

export const MAX_PUBLIC_BODY = 16 * 1024;

export function json(data: unknown, status = 200, extra?: Record<string, string>) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", ...extra } });
}

/** Rejects cross-site browser posts to the hosted-site endpoints. */
export function sameOriginOrNoOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readJsonBody(req: Request): Promise<unknown | null> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) return null;
  const text = await req.text();
  if (text.length > MAX_PUBLIC_BODY) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
