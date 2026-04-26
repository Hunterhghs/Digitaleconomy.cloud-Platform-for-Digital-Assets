"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reportSchema } from "@/lib/validators/asset";

export type SimpleResult = { ok: boolean; message?: string };

export async function toggleLike(assetId: string): Promise<SimpleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to like assets." };

  const { error } = await supabase.rpc("toggle_like", { p_asset_id: assetId });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function fileReport(formData: FormData): Promise<SimpleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = reportSchema.safeParse({
    asset_id: String(formData.get("asset_id") ?? ""),
    reason: String(formData.get("reason") ?? ""),
    details: String(formData.get("details") ?? ""),
  });
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    const first = Object.values(fe).flat().filter(Boolean)[0];
    return { ok: false, message: first ?? "Invalid input" };
  }

  const { error } = await supabase.from("reports").insert({
    asset_id: parsed.data.asset_id,
    reporter_id: user.id,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Thanks for the report; our team will review it." };
}
