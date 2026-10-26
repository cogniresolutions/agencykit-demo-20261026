import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ak_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionClaims = { sub: string; aid: string };

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters. Run ./scripts/setup.sh.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ aid: claims.aid })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setIssuer("agencykit")
    .setAudience("agencykit")
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
      issuer: "agencykit",
      audience: "agencykit",
    });
    if (typeof payload.sub !== "string" || typeof payload.aid !== "string") return null;
    return { sub: payload.sub, aid: payload.aid };
  } catch {
    return null;
  }
}

export function cookieSecure(): boolean {
  return process.env.COOKIE_SECURE !== "false";
}
