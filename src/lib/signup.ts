import "server-only";
import { count } from "drizzle-orm";
import { agencies } from "@/db/schema";
import { db } from "@/lib/db";

/** The first signup creates the agency owner. After that, signup is closed unless ALLOW_SIGNUP=true. */
export async function signupAllowed() {
  if (process.env.ALLOW_SIGNUP === "true") return true;
  const [row] = await db.select({ n: count() }).from(agencies);
  return (row?.n ?? 0) === 0;
}
