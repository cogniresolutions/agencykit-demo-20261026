import "server-only";
import { headers } from "next/headers";

/** Best-effort client IP. Put a reverse proxy in front in production. */
export function ipFromHeaders(h: Headers): string {
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  return (h.get("x-real-ip") ?? "unknown").slice(0, 64);
}

export async function clientIp(): Promise<string> {
  return ipFromHeaders(await headers());
}
