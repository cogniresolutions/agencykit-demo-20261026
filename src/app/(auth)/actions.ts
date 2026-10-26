"use server";

import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { agencies, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { burnPasswordCheck, endSession, hashPassword, startSession, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { loginLimiter, signupLimiter } from "@/lib/rate-limit";
import { ipFromHeaders } from "@/lib/request";
import { signupAllowed } from "@/lib/signup";
import { emailSchema, fieldErrors, nameSchema, passwordSchema, type FormState } from "@/lib/validation";

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(128),
  next: z.string().max(300).optional(),
});

function safeNext(next: string | undefined) {
  // Only allow same-site relative paths into the app.
  if (next && /^\/app(\/[A-Za-z0-9\-_/]*)?$/.test(next)) return next;
  return "/app";
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { email, password } = parsed.data;

  const ip = ipFromHeaders(await headers());
  const limited = loginLimiter.take(`${ip}|${email}`);
  if (!limited.ok) {
    return { error: `Too many attempts. Try again in ${Math.ceil(limited.retryAfterSeconds / 60)} minute(s).` };
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    await burnPasswordCheck(password);
    return { error: "Email or password is incorrect." };
  }
  const valid = await verifyPassword(password, user.passwordHash);

  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_agency', ${user.agencyId}, true)`);
    if (valid) await tx.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    await audit(tx, {
      agencyId: user.agencyId,
      actor: user.email,
      actorUserId: user.id,
      action: valid ? "auth.login" : "auth.login_failed",
      entity: "user",
      entityId: user.id,
      ip,
    });
  });

  if (!valid) return { error: "Email or password is incorrect." };
  loginLimiter.reset(`${ip}|${email}`);
  await startSession(user.id, user.agencyId);
  redirect(safeNext(parsed.data.next));
}

const signupSchema = z.object({
  name: nameSchema,
  agencyName: z.string().trim().min(2, "Agency name is required").max(80),
  email: emailSchema,
  password: passwordSchema,
});

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    agencyName: formData.get("agencyName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const ip = ipFromHeaders(await headers());
  if (!signupLimiter.take(ip).ok) return { error: "Too many signups from this network. Try again shortly." };
  if (!(await signupAllowed())) {
    return { error: "Signup is closed on this installation. Ask your agency owner for an invite." };
  }

  const { name, agencyName, email, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  let created: { userId: string; agencyId: string } | null = null;
  try {
    created = await db.transaction(async (tx) => {
      const [agency] = await tx.insert(agencies).values({ name: agencyName }).returning({ id: agencies.id });
      await tx.execute(sql`select set_config('app.current_agency', ${agency.id}, true)`);
      const [user] = await tx
        .insert(users)
        .values({ agencyId: agency.id, email, name, passwordHash, role: "owner" })
        .returning({ id: users.id });
      await audit(tx, {
        agencyId: agency.id,
        actor: email,
        actorUserId: user.id,
        action: "agency.created",
        entity: "agency",
        entityId: agency.id,
        ip,
      });
      return { userId: user.id, agencyId: agency.id };
    });
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return { fieldErrors: { email: "An account with this email already exists" } };
    throw err;
  }

  await startSession(created.userId, created.agencyId);
  redirect("/app");
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}
