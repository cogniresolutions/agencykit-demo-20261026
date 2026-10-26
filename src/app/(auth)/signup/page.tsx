import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth-forms";
import { Card, buttonClass } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { signupAllowed } from "@/lib/signup";

export const metadata: Metadata = { title: "Create your agency" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/app");
  if (!(await signupAllowed())) {
    return (
      <Card className="p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Signup is closed</h1>
        <p className="mt-2 text-sm text-ink-300">
          This installation already has an agency. Ask the owner to add you from Settings, or set ALLOW_SIGNUP=true.
        </p>
        <Link href="/login" className={buttonClass("primary", "mt-6 w-full h-11")}>
          Go to sign in
        </Link>
      </Card>
    );
  }
  return <SignupForm />;
}
