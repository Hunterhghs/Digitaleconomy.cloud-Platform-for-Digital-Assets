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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash") ?? url.searchParams.get("token");
  const typeParam = url.searchParams.get("type");
  const errorParam = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (errorParam) {
    const target = new URL("/login", url.origin);
    target.searchParams.set("error", errorParam);
    return NextResponse.redirect(target);
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    const target = new URL("/login", url.origin);
    target.searchParams.set("error", error.message || "callback");
    return NextResponse.redirect(target);
  }

  if (tokenHash && typeParam && VALID_OTP_TYPES.has(typeParam as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: typeParam as EmailOtpType,
    });
    if (!error) {
      const dest =
        typeParam === "recovery" ? "/reset-password/update" : next;
      return NextResponse.redirect(new URL(dest, url.origin));
    }
    const target = new URL("/login", url.origin);
    target.searchParams.set("error", error.message || "verification_failed");
    return NextResponse.redirect(target);
  }

  // No server-readable params. The auth response may be in the URL hash
  // fragment (legacy implicit flow). Hand off to a client-side handler that
  // can read `window.location.hash`, set the session, and route correctly.
  const handoff = new URL("/auth/handle", url.origin);
  handoff.searchParams.set("next", next);
  return NextResponse.redirect(handoff);
}
