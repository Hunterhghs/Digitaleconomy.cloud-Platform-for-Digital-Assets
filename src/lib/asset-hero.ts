import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { publicPreviewUrl } from "@/lib/queries";
import { isImageMime } from "@/lib/utils";

type AssetPreviewFields = {
  thumbnail_path: string | null;
  file_path: string;
  mime_type: string;
  status: string;
};

/**
 * Public preview bucket URL when available; otherwise a short-lived signed URL
 * to the original file for images (published assets, or drafts viewed by owner).
 * Needed when the duplicate upload to `assets-preview` failed silently or was skipped.
 */
export async function resolveImageHeroUrl(
  asset: AssetPreviewFields,
  opts: {
    viewerUserId: string | null;
    ownerId: string;
    /** Open Graph / Twitter cards — never sign originals for non-published assets */
    forPublicMetadata?: boolean;
  },
): Promise<string | null> {
  const thumb = publicPreviewUrl(asset.thumbnail_path);
  if (thumb) return thumb;

  if (!isImageMime(asset.mime_type) || !asset.file_path) return null;

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
