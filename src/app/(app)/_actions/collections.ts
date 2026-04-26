"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export type CollectionResult = { ok: boolean; message?: string; id?: string };

export async function createCollection(formData: FormData): Promise<CollectionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { ok: false, message: "Pick a longer name." };
  const isPublic = String(formData.get("is_public") ?? "true") === "true";
  const slugBase = slugify(name) || "collection";

  const { data, error } = await supabase
    .from("collections")
    .insert({
      owner_id: user.id,
      name,
      slug: `${slugBase}-${Math.random().toString(36).slice(2, 6)}`,
      is_public: isPublic,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard");
  return { ok: true, id: data.id };
}

export async function addToCollection(collectionId: string, assetId: string): Promise<CollectionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("collection_items")
    .upsert({ collection_id: collectionId, asset_id: assetId }, { onConflict: "collection_id,asset_id" });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function removeFromCollection(collectionId: string, assetId: string): Promise<CollectionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("collection_items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("asset_id", assetId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteCollection(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("collections").delete().eq("id", id);
  revalidatePath("/dashboard");
}
