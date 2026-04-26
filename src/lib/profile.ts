import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";

export type CurrentProfile = {
  id: string;
  handle: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  links: Record<string, unknown> | null;
  role: "user" | "moderator" | "admin";
};

export type HeaderProfile = {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "user" | "moderator" | "admin";
};

const HANDLE_RE = /^[a-z0-9_]{3,24}$/;

function deriveBaseHandle(user: User): string {
  const meta = user.user_metadata ?? {};
  const candidates = [
    typeof meta.preferred_username === "string" ? meta.preferred_username : null,
    typeof meta.user_name === "string" ? meta.user_name : null,
    typeof meta.username === "string" ? meta.username : null,
    user.email ? user.email.split("@")[0] : null,
  ];
  let base = "";
  for (const c of candidates) {
    if (!c) continue;
    base = c;
    break;
  }
  base = base
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]+/g, "")
    .slice(0, 20);
  if (base.length < 3) {
    const suffix = (user.id || "").replace(/-/g, "").slice(0, 4) || "user";
    base = (base + suffix).slice(0, 20);
  }
  return base;
}

function deriveDisplayName(user: User): string | null {
  const meta = user.user_metadata ?? {};
  const candidates = [meta.full_name, meta.name, meta.display_name];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

async function tryInsertProfile(
  client: SupabaseClient,
  userId: string,
  baseHandle: string,
  display: string | null,
): Promise<{ ok: boolean; conflict: boolean; lastError: string | null }> {
  let lastError: string | null = null;
  for (let i = 0; i < 12; i++) {
    const candidate = i === 0 ? baseHandle : `${baseHandle.slice(0, 20)}${i}`.slice(0, 24);
    if (!HANDLE_RE.test(candidate)) continue;
    const { error } = await client
      .from("profiles")
      .insert({ id: userId, handle: candidate, display_name: display });
    if (!error) return { ok: true, conflict: false, lastError: null };
    const code = (error as { code?: string }).code;
    lastError = `${code ?? "?"}: ${error.message}`;
    if (code !== "23505") break;
  }
  // Random suffix as a last resort.
  const random = Math.random().toString(36).replace(/[^a-z0-9]/g, "").slice(0, 6) || "x1";
  const fallback = `${baseHandle.slice(0, 17)}${random}`.slice(0, 24);
  if (HANDLE_RE.test(fallback)) {
    const { error } = await client
      .from("profiles")
      .insert({ id: userId, handle: fallback, display_name: display });
    if (!error) return { ok: true, conflict: false, lastError };
    lastError = `${(error as { code?: string }).code ?? "?"}: ${error.message}`;
  }
  return { ok: false, conflict: false, lastError };
}

/**
 * Returns the caller's profile, creating one on the fly if none exists.
 * Belt-and-braces companion to the `handle_new_user` DB trigger so accounts
 * always have a usable profile even if the trigger didn't run.
 *
 * If the user-scoped insert fails (RLS edge cases, JWT race, etc.) we fall
 * back to the service-role client which bypasses RLS — only as a last resort,
 * never in response to user-supplied data.
 */
export async function getOrCreateCurrentProfile(
  supabase: SupabaseClient,
): Promise<CurrentProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, handle, display_name, bio, avatar_url, links, role")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) return existing as CurrentProfile;

  const baseHandle = deriveBaseHandle(user);
  const display = deriveDisplayName(user);

  // First try the user-scoped client (uses the user's JWT, RLS-friendly).
  const userScoped = await tryInsertProfile(supabase, user.id, baseHandle, display);
  if (userScoped.ok) {
    const { data: created } = await supabase
      .from("profiles")
      .select("id, handle, display_name, bio, avatar_url, links, role")
      .eq("id", user.id)
      .maybeSingle();
    if (created) return created as CurrentProfile;
  } else {
    console.warn(
      "[profile] user-scoped profile insert failed",
      { userId: user.id, lastError: userScoped.lastError },
    );
  }

  // Fall back to the service role if available. This is safe because we are
  // creating a row keyed to the authenticated user's ID — we never read
  // user-supplied input.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const adminScoped = await tryInsertProfile(admin, user.id, baseHandle, display);
      if (adminScoped.ok) {
        const { data: created } = await admin
          .from("profiles")
          .select("id, handle, display_name, bio, avatar_url, links, role")
          .eq("id", user.id)
          .maybeSingle();
        if (created) return created as CurrentProfile;
      } else {
        console.error(
          "[profile] admin-scoped profile insert failed",
          { userId: user.id, lastError: adminScoped.lastError },
        );
      }
    } catch (err) {
      console.error("[profile] admin client unavailable", err);
    }
  } else {
    console.warn(
      "[profile] SUPABASE_SERVICE_ROLE_KEY not set; cannot retry profile insert as admin",
    );
  }

  return null;
}
