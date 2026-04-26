"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function unlinkWallet(walletId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("wallets")
    .delete()
    .eq("id", walletId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings/wallet");
  return { ok: true };
}

export async function setPrimaryWallet(walletId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("wallets")
    .select("id")
    .eq("id", walletId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!target) return { error: "Wallet not found" };

  await admin.from("wallets").update({ is_primary: false }).eq("user_id", user.id);
  const { error } = await admin
    .from("wallets")
    .update({ is_primary: true })
    .eq("id", walletId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings/wallet");
  return { ok: true };
}
