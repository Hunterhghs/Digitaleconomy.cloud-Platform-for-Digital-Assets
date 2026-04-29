"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assetMetaSchema, updateAssetSchema } from "@/lib/validators/asset";
import { isAllowedMime, MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB } from "@/lib/site";
import { slugify, shortId } from "@/lib/utils";

export type UploadActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  asset?: { id: string; slug: string; ownerHandle: string };
};

function flatten(errors: Record<string, string[] | undefined>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(errors)) if (v?.[0]) out[k] = v[0];
  return out;
}

/**
 * Server-action upload. Best for files up to ~10 MB; for larger files the
 * client-side resumable uploader (`UploadWizard`) writes directly to Storage
 * and then calls `finalizeAsset` below.
 */
export async function uploadAndCreateAsset(
  _prev: UploadActionState | undefined,
  formData: FormData,
): Promise<UploadActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/upload");

  const file = formData.get("file") as File | null;
  if (!file || !file.size) return { ok: false, message: "Pick a file to upload." };
  if (file.size > MAX_UPLOAD_SIZE_BYTES)
    return { ok: false, message: `Files must be ${MAX_UPLOAD_SIZE_MB} MB or smaller.` };
  if (!isAllowedMime(file.type, file.name))
    return { ok: false, message: `File type "${file.type}" is not currently allowed.` };

  const tagsRaw = String(formData.get("tags") ?? "");
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 15);

  const parsed = assetMetaSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    category_id: (formData.get("category_id") as string) || null,
    license: String(formData.get("license") ?? "CC-BY"),
    tags,
    status: (String(formData.get("status") ?? "published") === "draft" ? "draft" : "published"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error.flatten().fieldErrors) };
  }

  const meta = parsed.data;
  const id = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-z0-9._-]+/gi, "_").slice(-128) || "file";
  const filePath = `${user.id}/${id}/${safeName}`;

  const { error: upErr } = await supabase.storage
    .from("assets-original")
    .upload(filePath, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (upErr) return { ok: false, message: `Upload failed: ${upErr.message}` };

  let thumbPath: string | null = null;
  if (file.type.startsWith("image/")) {
    const previewPath = `${user.id}/${id}/preview-${safeName}`;
    const { error: prevErr } = await supabase.storage
      .from("assets-preview")
      .upload(previewPath, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
    if (!prevErr) thumbPath = previewPath;
  }

  return finalizeInsert({
    supabase,
    userId: user.id,
    id,
    meta,
    file: { path: filePath, mime: file.type, size: file.size, thumbPath },
  });
}

/**
 * Called by the client-side resumable uploader after the file is in Storage.
 */
export async function finalizeAsset(
  _prev: UploadActionState | undefined,
  formData: FormData,
): Promise<UploadActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/upload");

  const tagsRaw = String(formData.get("tags") ?? "");
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 15);

  const parsed = assetMetaSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    category_id: (formData.get("category_id") as string) || null,
    license: String(formData.get("license") ?? "CC-BY"),
    tags,
    status: (String(formData.get("status") ?? "published") === "draft" ? "draft" : "published"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error.flatten().fieldErrors) };
  }

  const id = String(formData.get("id") ?? "");
  const filePath = String(formData.get("file_path") ?? "");
  const mime = String(formData.get("mime_type") ?? "application/octet-stream");
  const size = Number(formData.get("size_bytes") ?? 0);
  const thumbPath = (String(formData.get("thumbnail_path") ?? "") || null) as string | null;

  const originalFilename = String(formData.get("original_filename") ?? "");
  const pathTail = filePath.split("/").pop() ?? "";
  if (!id || !filePath || !size) {
    return { ok: false, message: "Upload incomplete; please try again." };
  }
  if (!isAllowedMime(mime, originalFilename || pathTail))
    return { ok: false, message: `Type "${mime}" is not allowed.` };
  if (size > MAX_UPLOAD_SIZE_BYTES) return { ok: false, message: `Max ${MAX_UPLOAD_SIZE_MB} MB.` };

  return finalizeInsert({
    supabase,
    userId: user.id,
    id,
    meta: parsed.data,
    file: { path: filePath, mime, size, thumbPath },
  });
}

async function finalizeInsert(args: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  id: string;
  meta: ReturnType<typeof assetMetaSchema.parse>;
  file: { path: string; mime: string; size: number; thumbPath: string | null };
}): Promise<UploadActionState> {
  const { supabase, userId, id, meta, file } = args;

  const baseSlug = slugify(meta.title) || "asset";
  const slug = `${baseSlug}-${shortId(5)}`;

  const { error: insertErr } = await supabase.from("assets").insert({
    id,
    owner_id: userId,
    title: meta.title,
    slug,
    description: meta.description?.toString() || null,
    category_id: meta.category_id ?? null,
    license: meta.license as "CC0" | "CC-BY" | "CC-BY-SA" | "CC-BY-NC" | "ARR",
    status: meta.status,
    file_path: file.path,
    mime_type: file.mime,
    size_bytes: file.size,
    thumbnail_path: file.thumbPath,
  });
  if (insertErr) {
    await supabase.storage.from("assets-original").remove([file.path]);
    if (file.thumbPath) await supabase.storage.from("assets-preview").remove([file.thumbPath]);
    return { ok: false, message: insertErr.message };
  }

  if (meta.tags && meta.tags.length > 0) {
    await ensureTagsAndLink(supabase, id, meta.tags);
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", userId)
    .maybeSingle();
  const handle = prof?.handle ?? "me";

  revalidatePath("/", "layout");
  revalidatePath(`/u/${handle}`);
  return {
    ok: true,
    message: "Asset published.",
    asset: { id, slug, ownerHandle: handle },
  };
}

async function ensureTagsAndLink(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assetId: string,
  rawTags: string[],
) {
  const cleaned = Array.from(
    new Set(
      rawTags
        .map((t) => t.toLowerCase().trim())
        .filter((t) => t.length >= 2 && t.length <= 32),
    ),
  );
  if (cleaned.length === 0) return;

  const slugs = cleaned.map((t) => slugify(t));
  const { data: existing } = await supabase
    .from("tags")
    .select("id, slug")
    .in("slug", slugs);
  const existingSlugs = new Set((existing ?? []).map((t) => t.slug));
  const toInsert = cleaned
    .map((name, i) => ({ name, slug: slugs[i] }))
    .filter((t) => !existingSlugs.has(t.slug));
  if (toInsert.length > 0) {
    await supabase.from("tags").insert(toInsert);
  }
  const { data: all } = await supabase.from("tags").select("id, slug").in("slug", slugs);
  const links = (all ?? []).map((t) => ({ asset_id: assetId, tag_id: t.id }));
  if (links.length > 0) await supabase.from("asset_tags").upsert(links, { onConflict: "asset_id,tag_id" });
}

export async function deleteAsset(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data: asset } = await supabase
    .from("assets")
    .select("file_path, thumbnail_path, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!asset || asset.owner_id !== user.id) return;

  if (asset.file_path) await supabase.storage.from("assets-original").remove([asset.file_path]);
  if (asset.thumbnail_path) await supabase.storage.from("assets-preview").remove([asset.thumbnail_path]);
  await supabase.from("assets").delete().eq("id", id);

  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

export async function updateAssetMeta(
  _prev: UploadActionState | undefined,
  formData: FormData,
): Promise<UploadActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tagsRaw = String(formData.get("tags") ?? "");
  const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 15);

  const parsed = updateAssetSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    category_id: (formData.get("category_id") as string) || null,
    license: String(formData.get("license") ?? "CC-BY"),
    tags,
    status: String(formData.get("status") ?? "published") === "draft" ? "draft" : "published",
  });
  if (!parsed.success) return { ok: false, fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const { id, title, description, category_id, license, status, tags: tagList } = parsed.data;

  const { error } = await supabase
    .from("assets")
    .update({
      title,
      description: description || null,
      category_id: category_id ?? null,
      license: license as "CC0" | "CC-BY" | "CC-BY-SA" | "CC-BY-NC" | "ARR",
      status,
    })
    .eq("id", id)
    .eq("owner_id", user.id);
  if (error) return { ok: false, message: error.message };

  await supabase.from("asset_tags").delete().eq("asset_id", id);
  if (tagList && tagList.length > 0) await ensureTagsAndLink(supabase, id, tagList);

  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}
