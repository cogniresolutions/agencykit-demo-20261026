import "server-only";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { agencies, users } from "@/db/schema";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  cookieSecure,
  signSession,
  verifySession,
} from "@/lib/session-token";

export const BCRYPT_COST = 12;

export type CurrentUser = {
  id: string;
  agencyId: string;
  agencyName: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "member";
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// Keeps response timing constant when the email is unknown.
let dummyHash: Promise<string> | null = null;
export async function burnPasswordCheck(password: string) {
  dummyHash ??= bcrypt.hash(crypto.randomUUID(), BCRYPT_COST);
  await bcrypt.compare(password, await dummyHash).catch(() => false);
}

export async function startSession(userId: string, agencyId: string) {
  const token = await signSession({ sub: userId, aid: agencyId });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Verifies the session cookie and loads the user fresh from the database. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const claims = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  const rows = await db
    .select({
      id: users.id,
      agencyId: users.agencyId,
      email: users.email,
      name: users.name,
      role: users.role,
      agencyName: agencies.name,
    })
    .from(users)
    .innerJoin(agencies, eq(agencies.id, users.agencyId))
    .where(eq(users.id, claims.sub))
    .limit(1);
  const user = rows[0];
  if (!user || user.agencyId !== claims.aid) return null;
  return user;
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function isAgencyAdmin(user: CurrentUser) {
  return user.role === "owner" || user.role === "admin";
}
