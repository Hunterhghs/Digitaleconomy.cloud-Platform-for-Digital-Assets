import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentProfile } from "@/lib/profile";
import type { AssetCardData } from "@/components/asset-card";

const PUBLIC_PREVIEW_BUCKET = "assets-preview";

export function publicPreviewUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${PUBLIC_PREVIEW_BUCKET}/${path}`;
}

type RawAsset = {
  id: string;
  slug: string;
  title: string;
  mime_type: string;
  size_bytes: number;
  thumbnail_path: string | null;
  license: string;
  download_count: number;
  view_count: number;
  like_count: number;
  owner: { handle: string; display_name: string | null; avatar_url: string | null } | null;
};

function toCardData(a: RawAsset): AssetCardData | null {
  if (!a.owner) return null;
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    mime_type: a.mime_type,
    size_bytes: a.size_bytes,
    thumbnail_url: publicPreviewUrl(a.thumbnail_path),
    license: a.license,
    download_count: a.download_count,
    view_count: a.view_count,
    like_count: a.like_count,
    owner: a.owner,
  };
}

const ASSET_SELECT =
  "id, slug, title, mime_type, size_bytes, thumbnail_path, license, download_count, view_count, like_count, owner:profiles!assets_owner_id_fkey(handle, display_name, avatar_url)";

export const getCategories = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, icon, sort_order")
    .order("sort_order", { ascending: true });
  return data ?? [];
});

export type ExploreSort = "trending" | "new" | "downloads";

export async function listAssets(opts: {
  sort?: ExploreSort;
  q?: string;
  category?: string;
  tag?: string;
  license?: string;
  ownerHandle?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const supabase = await createClient();
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 60);
  const offset = Math.max(opts.offset ?? 0, 0);

  let query = supabase.from("assets").select(ASSET_SELECT).eq("status", "published");

  if (opts.q) {
    const term = opts.q.replace(/'/g, "");
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }
  if (opts.category) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", opts.category)
      .maybeSingle();
    if (cat?.id) query = query.eq("category_id", cat.id);
    else return [];
  }
  if (opts.tag) {
    const { data: tag } = await supabase.from("tags").select("id").eq("slug", opts.tag).maybeSingle();
    if (tag?.id) {
      const { data: links } = await supabase.from("asset_tags").select("asset_id").eq("tag_id", tag.id);
      const ids = (links ?? []).map((x) => x.asset_id);
      if (ids.length === 0) return [];
      query = query.in("id", ids);
    } else return [];
  }
  if (opts.license) query = query.eq("license", opts.license);
  if (opts.ownerHandle) {
    const { data: owner } = await supabase
      .from("profiles")
      .select("id")
      .eq("handle", opts.ownerHandle)
      .maybeSingle();
    if (owner?.id) query = query.eq("owner_id", owner.id);
    else return [];
  }

  const sort = opts.sort ?? "new";
  if (sort === "downloads") query = query.order("download_count", { ascending: false });
  else if (sort === "trending")
    query = query
      .order("like_count", { ascending: false })
      .order("download_count", { ascending: false })
      .order("created_at", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error) {
    console.error("listAssets failed", error);
    return [];
  }

  return (data as unknown as RawAsset[])
    .map(toCardData)
    .filter((x): x is AssetCardData => x !== null);
}

export async function getAssetByOwnerAndSlug(handle: string, slug: string) {
  const supabase = await createClient();
  const { data: owner } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url, bio")
    .eq("handle", handle)
    .maybeSingle();
  if (!owner) return null;

  const { data: asset } = await supabase
    .from("assets")
    .select(
      "id, owner_id, title, slug, description, license, status, file_path, mime_type, size_bytes, thumbnail_path, download_count, view_count, like_count, created_at, updated_at, category:categories(name, slug)",
    )
    .eq("owner_id", owner.id)
    .eq("slug", slug)
    .maybeSingle();
  if (!asset) return null;

  const { data: tagLinks } = await supabase
    .from("asset_tags")
    .select("tag:tags(id, name, slug)")
    .eq("asset_id", asset.id);
  const tags = (tagLinks ?? [])
    .map((t) => (Array.isArray(t.tag) ? t.tag[0] : t.tag))
    .filter(Boolean) as { id: string; name: string; slug: string }[];

  return { asset, owner, tags };
}

export async function getProfileByHandle(handle: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, handle, display_name, bio, avatar_url, links, created_at")
    .eq("handle", handle)
    .maybeSingle();
  return data;
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  return getOrCreateCurrentProfile(supabase);
}
