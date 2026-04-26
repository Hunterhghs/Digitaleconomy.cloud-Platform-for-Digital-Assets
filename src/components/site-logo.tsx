import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteLogo({ className, withWordmark = true }: { className?: string; withWordmark?: boolean }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2", className)} aria-label={siteConfig.name}>
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-primary via-primary to-fuchsia-500 text-primary-foreground shadow-sm transition-transform group-hover:scale-105"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7l8-4 8 4-8 4-8-4z" />
          <path d="M4 12l8 4 8-4" />
          <path d="M4 17l8 4 8-4" />
        </svg>
      </span>
      {withWordmark ? (
        <span className="flex items-baseline gap-0.5 font-semibold tracking-tight">
          <span>DigitalEconomy</span>
          <span className="text-muted-foreground">.cloud</span>
        </span>
      ) : null}
    </Link>
  );
}
