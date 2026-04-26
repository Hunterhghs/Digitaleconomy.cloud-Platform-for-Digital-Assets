"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function humanizeError(input: string) {
  const decoded = decodeURIComponent(input);
  if (decoded === "callback") {
    return "We couldn't complete your sign-in. Please try again or request a new email link.";
  }
  if (decoded === "verification_failed") {
    return "That confirmation link is invalid or has expired. Please request a new one.";
  }
  return decoded;
}

function AuthNoticeInner() {
  const params = useSearchParams();
  const error = params.get("error");
  const notice = params.get("notice");

  if (!error && !notice) return null;

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {humanizeError(error)}
      </div>
    );
  }

  return (
    <div
      role="status"
      className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
    >
      {decodeURIComponent(notice ?? "")}
    </div>
  );
}

export function AuthNotice() {
  return (
    <Suspense>
      <AuthNoticeInner />
    </Suspense>
  );
}
