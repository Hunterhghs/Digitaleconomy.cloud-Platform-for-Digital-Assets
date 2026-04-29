import { createClient } from "@/lib/supabase/server";
import { isProfilesTableMissingError } from "@/lib/supabase-errors";

/**
 * When migrations were never applied to the linked Supabase project, PostgREST
 * returns errors like "Could not find the table public.profiles in the schema cache".
 * Show a prominent banner so signing-in users are not stuck with cryptic form errors.
 */
export async function DatabaseSetupBanner() {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").select("id").limit(1);

  if (!error) return null;
  if (!isProfilesTableMissingError(error)) return null;

  return (
    <div
      role="alert"
      className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-4 text-sm text-destructive"
    >
      <p className="font-semibold">Database setup required</p>
      <p className="mt-2 leading-relaxed">
        Your Supabase project is missing the platform tables (for example{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">public.profiles</code>
        ). Until an administrator runs the SQL migrations, saving your profile cannot succeed.
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-destructive/95">
        <li>Open the Supabase Dashboard → your project → SQL Editor → New query.</li>
        <li>
          Copy the entire contents of{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
            supabase/FULL_SETUP_RUN_ONCE.sql
          </code>{" "}
          from the GitHub repository (root of this codebase).
        </li>
        <li>Click Run. Wait until it completes successfully (~30 seconds).</li>
        <li>
          Optionally: Settings → API → Restart project (refreshes the schema cache), then reload this page.
        </li>
      </ol>
      <p className="mt-3 text-xs opacity-90">
        Technical detail: {error.message}
      </p>
    </div>
  );
}
