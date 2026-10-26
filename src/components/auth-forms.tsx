"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, signupAction } from "@/app/(auth)/actions";
import { Button, Card, Field, Input } from "@/components/ui";
import type { FormState } from "@/lib/validation";

function ErrorBanner({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <div role="alert" className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
      {state.error}
    </div>
  );
}

function FieldError({ state, name }: { state: FormState; name: string }) {
  const msg = state?.fieldErrors?.[name];
  return msg ? <p className="mt-1.5 text-xs text-danger">{msg}</p> : null;
}

export function LoginForm({ next, signupOpen }: { next?: string; signupOpen: boolean }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <Card className="p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-white">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-300">Sign in to your agency workspace.</p>
      <form action={action} className="mt-8 grid gap-4">
        <ErrorBanner state={state} />
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@agency.com" />
          <FieldError state={state} name="email" />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
          <FieldError state={state} name="password" />
        </Field>
        <Button type="submit" disabled={pending} className="mt-2 h-11">
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      {signupOpen ? (
        <p className="mt-6 text-center text-sm text-ink-400">
          New here?{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            Create your agency
          </Link>
        </p>
      ) : null}
    </Card>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, undefined);
  return (
    <Card className="p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-white">Create your agency</h1>
      <p className="mt-1 text-sm text-ink-300">You will be the owner. Add clients as sub-accounts next.</p>
      <form action={action} className="mt-8 grid gap-4">
        <ErrorBanner state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" htmlFor="name">
            <Input id="name" name="name" autoComplete="name" required placeholder="Alex Rivera" />
            <FieldError state={state} name="name" />
          </Field>
          <Field label="Agency name" htmlFor="agencyName">
            <Input id="agencyName" name="agencyName" required placeholder="Northstar Digital" />
            <FieldError state={state} name="agencyName" />
          </Field>
        </div>
        <Field label="Work email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@agency.com" />
          <FieldError state={state} name="email" />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 12 characters.">
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
          <FieldError state={state} name="password" />
        </Field>
        <Button type="submit" disabled={pending} className="mt-2 h-11">
          {pending ? "Creating agency..." : "Create agency"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
