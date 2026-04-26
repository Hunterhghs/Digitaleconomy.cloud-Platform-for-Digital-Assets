"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "moderator" && profile.role !== "admin")) {
    redirect("/");
  }
  return supabase;
}

export async function takedownAsset(formData: FormData) {
  const supabase = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "");
  if (!id) return;
  await supabase.from("assets").update({ status: "removed" }).eq("id", id);
  await supabase
    .from("reports")
    .update({ status: "actioned", resolved_at: new Date().toISOString(), resolution_note: note || null })
    .eq("asset_id", id)
    .eq("status", "open");
  revalidatePath("/admin");
}

export async function dismissReport(formData: FormData) {
  const supabase = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "");
  if (!id) return;
  await supabase
    .from("reports")
    .update({ status: "dismissed", resolved_at: new Date().toISOString(), resolution_note: note || null })
    .eq("id", id);
  revalidatePath("/admin");
}

export async function restoreAsset(formData: FormData) {
  const supabase = await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("assets").update({ status: "published" }).eq("id", id);
  revalidatePath("/admin");
}
