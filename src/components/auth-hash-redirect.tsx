"use client";

import { useEffect } from "react";

/**
 * If a Supabase email link drops the user on any page with auth tokens in the
 * URL hash (e.g. https://site/#access_token=...&type=magiclink), forward to
 * /auth/handle which will set the session and route the user to the right
 * destination. This makes recovery / magic-link / signup links work even when
 * the email template wasn't updated to use the modern token_hash flow.
 */
export function AuthHashRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const accessToken = params.get("access_token");
    const errorCode = params.get("error_description") ?? params.get("error");

    if (!accessToken && !errorCode) return;
    if (window.location.pathname.startsWith("/auth/handle")) return;

    const target = new URL("/auth/handle", window.location.origin);
    target.searchParams.set("next", window.location.pathname === "/" ? "/dashboard" : window.location.pathname);
    target.hash = hash.startsWith("#") ? hash.slice(1) : hash;
    window.location.replace(target.toString());
  }, []);

  return null;
}
