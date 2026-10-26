import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { getCurrentUser } from "@/lib/auth";
import { signupAllowed } from "@/lib/signup";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/app");
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} signupOpen={await signupAllowed()} />;
}
