/**
 * Detect PostgREST errors when core tables were never created (migrations not applied).
 */
export function isProfilesTableMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { message?: string; code?: string };
  if (e.code === "PGRST205") return true;
  const m = (e.message ?? "").toLowerCase();
  return (
    m.includes("schema cache") ||
    (m.includes("profiles") && (m.includes("could not find") || m.includes("does not exist")))
  );
}

export const MISSING_DATABASE_SETUP_INSTRUCTIONS =
  "The database has not been initialized yet. In Supabase Dashboard → SQL Editor, paste and run the full schema file `supabase/FULL_SETUP_RUN_ONCE.sql` from this project's GitHub repo (the same migrations as `supabase/migrations/`). Wait ~30 seconds, then reload this page.";
