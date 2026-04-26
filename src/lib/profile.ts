import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";

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

/**
 * Returns the caller's profile, creating one on the fly if none exists.
 * Belt-and-braces companion to the `handle_new_user` DB trigger so accounts
 * always have a usable profile even if the trigger didn't run.
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

  for (let i = 0; i < 12; i++) {
    const candidate = i === 0 ? baseHandle : `${baseHandle.slice(0, 20)}${i}`.slice(0, 24);
    if (!HANDLE_RE.test(candidate)) continue;
    const { error: insertErr } = await supabase
      .from("profiles")
      .insert({ id: user.id, handle: candidate, display_name: display });
    if (!insertErr) {
      const { data: created } = await supabase
        .from("profiles")
        .select("id, handle, display_name, bio, avatar_url, links, role")
        .eq("id", user.id)
        .maybeSingle();
      if (created) return created as CurrentProfile;
    }
    const code = (insertErr as { code?: string } | null)?.code;
    if (code !== "23505") {
      // Anything other than a unique-violation means we should stop guessing.
      break;
    }
  }

  // Final fallback: append a 6-char random suffix.
  const random = Math.random().toString(36).replace(/[^a-z0-9]/g, "").slice(0, 6) || "x1";
  const fallback = `${baseHandle.slice(0, 17)}${random}`.slice(0, 24);
  if (HANDLE_RE.test(fallback)) {
    await supabase
      .from("profiles")
      .insert({ id: user.id, handle: fallback, display_name: display });
    const { data: created } = await supabase
      .from("profiles")
      .select("id, handle, display_name, bio, avatar_url, links, role")
      .eq("id", user.id)
      .maybeSingle();
    if (created) return created as CurrentProfile;
  }
  return null;
}
