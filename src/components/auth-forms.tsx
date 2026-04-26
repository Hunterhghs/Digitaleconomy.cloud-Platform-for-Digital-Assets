"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signInWithEmail,
  signUpWithEmail,
  requestPasswordReset,
  updatePassword,
  type AuthFormState,
} from "@/app/(auth)/_actions";

const initialState: AuthFormState = { ok: false };

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-xs text-destructive">{error}</p>;
}

function FormMessage({ state }: { state: AuthFormState }) {
  if (!state?.message) return null;
  return (
    <p
      className={`rounded-md border px-3 py-2 text-sm ${
        state.ok
          ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
          : "border-destructive/40 bg-destructive/10 text-destructive"
      }`}
    >
      {state.message}
    </p>
  );
}

export function SignInForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [state, formAction, pending] = useActionState(signInWithEmail, initialState);
  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="next" value={next} />
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <FieldError error={state?.fieldErrors?.email} />
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/reset-password" className="text-xs text-muted-foreground hover:text-foreground">
            Forgot?
          </Link>
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
        <FieldError error={state?.fieldErrors?.password} />
      </div>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpWithEmail, initialState);
  return (
    <form action={formAction} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <FieldError error={state?.fieldErrors?.email} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <FieldError error={state?.fieldErrors?.password} />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}

export function RequestResetForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);
  return (
    <form action={formAction} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <FieldError error={state?.fieldErrors?.email} />
      </div>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending..." : "Send reset link"}
      </Button>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);
  return (
    <form action={formAction} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        <FieldError error={state?.fieldErrors?.password} />
      </div>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Set new password"}
      </Button>
    </form>
  );
}
