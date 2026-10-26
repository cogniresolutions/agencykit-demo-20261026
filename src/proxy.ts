import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/lib/security-headers";
import { SESSION_COOKIE, verifySession } from "@/lib/session-token";

/**
 * Runs before every page and API route:
 *  - generates a per-request CSP nonce (no unsafe-eval in production)
 *  - sets frame protections (public websites may be framed by this app only)
 *  - protects /app with the signed session cookie
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const publicSite = pathname.startsWith("/s/");
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, { dev: process.env.NODE_ENV !== "production", publicSite });

  if (pathname === "/app" || pathname.startsWith("/app/")) {
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      const res = NextResponse.redirect(url);
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", publicSite ? "SAMEORIGIN" : "DENY");
  if (pathname.startsWith("/app") || pathname.startsWith("/api/sub")) {
    response.headers.set("Cache-Control", "no-store");
  }
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
