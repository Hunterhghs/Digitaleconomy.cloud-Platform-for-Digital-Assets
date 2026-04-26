import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SAFE_NEXT = /^\/[A-Za-z0-9_\-/?=&%.]*$/;

function safeNext(input: string | null, fallback = "/dashboard") {
  if (!input) return fallback;
  if (!SAFE_NEXT.test(input)) return fallback;
  return input;
}

type EmailOtpType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email";

const VALID_OTP_TYPES: ReadonlySet<EmailOtpType> = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

/**
 * Modern Supabase email template handler. Use the following template URL:
 *
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}&next={{ .RedirectTo }}
 *
 * For recovery emails the user is sent to /reset-password/update regardless
 * of `next`, so the password update form is always shown.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash =
    url.searchParams.get("token_hash") ?? url.searchParams.get("token");
  const typeParam = url.searchParams.get("type");
  const next = safeNext(url.searchParams.get("next"));

  if (!tokenHash || !typeParam || !VALID_OTP_TYPES.has(typeParam as EmailOtpType)) {
    const target = new URL("/login", url.origin);
    target.searchParams.set("error", "Missing or invalid confirmation token");
    return NextResponse.redirect(target);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: typeParam as EmailOtpType,
  });

  if (error) {
    const target = new URL("/login", url.origin);
    target.searchParams.set("error", error.message || "verification_failed");
    return NextResponse.redirect(target);
  }

  const dest = typeParam === "recovery" ? "/reset-password/update" : next;
  return NextResponse.redirect(new URL(dest, url.origin));
}
