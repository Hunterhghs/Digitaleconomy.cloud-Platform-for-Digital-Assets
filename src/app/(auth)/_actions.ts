"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/site";
import {
  signInSchema,
  signUpSchema,
  requestResetSchema,
  updatePasswordSchema,
} from "@/lib/validators/auth";

export type AuthFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  email?: string;
};

function flatten(errors: Record<string, string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(errors)) if (v?.[0]) out[k] = v[0];
  return out;
}

export async function signUpWithEmail(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error.flatten().fieldErrors) };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteConfig.url}/auth/callback?next=/dashboard`,
    },
  });
  if (error) return { ok: false, message: error.message };

  // If email confirmations are disabled in Supabase, the user already has a
  // session and we can drop them straight into the dashboard.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  return {
    ok: true,
    email: parsed.data.email,
    message:
      "We sent a confirmation link to your email. Please click it to finish creating your account.",
  };
}

export async function resendConfirmation(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, message: "Missing email." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${siteConfig.url}/auth/callback?next=/dashboard`,
    },
  });
  if (error) return { ok: false, message: error.message, email };
  return {
    ok: true,
    email,
    message: "We sent another confirmation email. Please check your inbox.",
  };
}

export async function signInWithEmail(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error.flatten().fieldErrors) };
  }
  const next = String(formData.get("next") ?? "/dashboard");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signInWithProvider(formData: FormData) {
  const provider = String(formData.get("provider") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");
  if (provider !== "google" && provider !== "github") return;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${siteConfig.url}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) return;
  redirect(data.url);
}

export async function requestPasswordReset(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = requestResetSchema.safeParse({ email: String(formData.get("email") ?? "") });
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error.flatten().fieldErrors) };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteConfig.url}/auth/callback?next=/reset-password/update`,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "If an account exists for that email, we sent a reset link." };
}

export async function updatePassword(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = updatePasswordSchema.safeParse({ password: String(formData.get("password") ?? "") });
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error.flatten().fieldErrors) };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: error.message };
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
