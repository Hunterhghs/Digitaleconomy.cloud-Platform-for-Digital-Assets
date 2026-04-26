"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">500</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Something broke</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        We&apos;re sorry — an unexpected error occurred. Try again, or head home.
      </p>
      <div className="mt-6 flex gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
