import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { publicPreviewUrl } from "@/lib/queries";
import { normalizeMimeType } from "@/lib/mime-normalize";
import { isAudioMime, isImageMime, isPdfMime, isVideoMime } from "@/lib/utils";

export type AssetPreviewFields = {
  thumbnail_path: string | null;
  file_path: string;
  mime_type: string;
  status: string;
};

function normalizedMime(asset: AssetPreviewFields): string {
  return normalizeMimeType(asset.mime_type, asset.file_path ?? "");
}

type ResolveOpts = {
  viewerUserId: string | null;
  ownerId: string;
  /** Open Graph / Twitter cards — never sign originals for non-published assets */
  forPublicMetadata?: boolean;
};

async function signedOriginalUrl(
  asset: AssetPreviewFields,
  opts: ResolveOpts,
): Promise<string | null> {
  if (!asset.file_path) return null;

  const published = asset.status === "published";
  const ownerView =
    opts.viewerUserId !== null &&
    opts.viewerUserId === opts.ownerId &&
    asset.status === "draft";

  if (opts.forPublicMetadata) {
    if (!published) return null;
  } else if (!published && !ownerView) {
    return null;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("assets-original")
    .createSignedUrl(asset.file_path, 900);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Public preview bucket URL when the asset is image or video; otherwise a short-lived signed URL
 * to the original file for images (published assets, or drafts viewed by owner).
 * Thumbnails are only used when MIME is image/video — avoids treating PDF/doc previews as raster heroes.
 */
export async function resolveImageHeroUrl(
  asset: AssetPreviewFields,
  opts: ResolveOpts,
): Promise<string | null> {
  const mime = normalizedMime(asset);
  const thumb = publicPreviewUrl(asset.thumbnail_path);
  if (thumb && (isImageMime(mime) || isVideoMime(mime))) return thumb;

  if (!isImageMime(mime) || !asset.file_path) return null;

  return signedOriginalUrl(asset, opts);
}

/** Signed URL for embedding PDFs inline (same visibility rules as image originals). */
export async function resolvePdfEmbedUrl(
  asset: AssetPreviewFields,
  opts: ResolveOpts,
): Promise<string | null> {
  const mime = normalizedMime(asset);
  if (!isPdfMime(mime) || !asset.file_path) return null;
  return signedOriginalUrl(asset, opts);
}

/** Signed URL for HTML5 `<video>` playback (same visibility rules as PDF embed). */
export async function resolveVideoPlaybackUrl(
  asset: AssetPreviewFields,
  opts: ResolveOpts,
): Promise<string | null> {
  const mime = normalizedMime(asset);
  if (!isVideoMime(mime) || !asset.file_path) return null;
  return signedOriginalUrl(asset, opts);
}

/** Signed URL for HTML5 `<audio>` playback. */
export async function resolveAudioPlaybackUrl(
  asset: AssetPreviewFields,
  opts: ResolveOpts,
): Promise<string | null> {
  const mime = normalizedMime(asset);
  if (!isAudioMime(mime) || !asset.file_path) return null;
  return signedOriginalUrl(asset, opts);
}
