"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validators/profile";

export type SettingsState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function updateProfile(
  _prev: SettingsState | undefined,
  formData: FormData,
): Promise<SettingsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = profileSchema.safeParse({
    handle: String(formData.get("handle") ?? ""),
    display_name: String(formData.get("display_name") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    website: String(formData.get("website") ?? ""),
  });
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(fe)) if (v?.[0]) out[k] = v[0];
    return { ok: false, fieldErrors: out };
  }

  const { handle, display_name, bio, website } = parsed.data;

  // ensure handle isn't taken by someone else
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle.toLowerCase())
    .neq("id", user.id)
    .maybeSingle();
  if (existing) {
    return { ok: false, fieldErrors: { handle: "That handle is taken" } };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      handle: handle.toLowerCase(),
      display_name: display_name || null,
      bio: bio || null,
      links: website ? { website } : null,
    })
    .eq("id", user.id);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}

export async function uploadAvatar(formData: FormData): Promise<SettingsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  const file = formData.get("avatar") as File | null;
  if (!file || !file.size) return { ok: false, message: "No file provided" };
  if (file.size > 2 * 1024 * 1024) return { ok: false, message: "Max 2 MB" };
  if (!file.type.startsWith("image/")) return { ok: false, message: "Image only" };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (upErr) return { ok: false, message: upErr.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  const { error: profErr } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);
  if (profErr) return { ok: false, message: profErr.message };

  revalidatePath("/", "layout");
  return { ok: true, message: "Avatar updated." };
}
