"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const SAFE_NEXT = /^\/[A-Za-z0-9_\-/?=&%.]*$/;

function safeNext(input: string | null, fallback = "/dashboard") {
  if (!input || !SAFE_NEXT.test(input)) return fallback;
  return input;
}

function AuthHandleInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<"working" | "error">("working");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const next = safeNext(params.get("next"));
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const search = typeof window !== "undefined" ? window.location.search : "";

      const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
      const queryParams = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashError = hashParams.get("error_description") ?? hashParams.get("error");
      const queryError = queryParams.get("error_description") ?? queryParams.get("error");
      const errorMsg = hashError ?? queryError;
      const type = hashParams.get("type") ?? queryParams.get("type");

      if (errorMsg) {
        if (!cancelled) {
          setErrorMessage(decodeURIComponent(errorMsg));
          setState("error");
        }
        return;
      }

      if (!accessToken || !refreshToken) {
        if (!cancelled) {
          setErrorMessage(
            "We couldn't process that link. It may have expired or already been used. Please request a new one.",
          );
          setState("error");
        }
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        if (!cancelled) {
          setErrorMessage(error.message);
          setState("error");
        }
        return;
      }

      if (!cancelled) {
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", window.location.pathname);
        }
        const dest = type === "recovery" ? "/reset-password/update" : next;
        router.replace(dest);
        router.refresh();
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <div className="container-page flex min-h-[calc(100vh-12rem)] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        {state === "working" ? (
          <>
            <h1 className="text-xl font-semibold">Verifying your link…</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              One moment while we sign you in.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">We couldn&apos;t verify that link</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {errorMessage ?? "The link may have expired or been used already."}
            </p>
            <div className="mt-6 grid gap-2">
              <Link
                href="/reset-password"
                className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-accent"
              >
                Request a new password reset
              </Link>
              <Link
                href="/login"
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthHandlePage() {
  return (
    <Suspense
      fallback={
        <div className="container-page flex min-h-[calc(100vh-12rem)] items-center justify-center py-10">
          <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold">Verifying your link…</h1>
          </div>
        </div>
      }
    >
      <AuthHandleInner />
    </Suspense>
  );
}
