import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Download, Calendar, FileText, Eye, Coins } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LikeButton } from "@/components/like-button";
import { ReportDialog } from "@/components/report-dialog";
import { DeleteAssetForm } from "@/components/delete-asset-form";
import { MimeIcon } from "@/components/asset-card";
import {
  formatBytes,
  formatNumber,
  isImageMime,
  isAudioMime,
  isVideoMime,
  isPdfMime,
  assetPreviewFallbackHint,
} from "@/lib/utils";
import { ASSET_LICENSES, siteConfig } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { getAssetByOwnerAndSlug, publicPreviewUrl } from "@/lib/queries";
import { effectiveMimeFromAsset } from "@/lib/mime-normalize";
import {
  resolveImageHeroUrl,
  resolvePdfEmbedUrl,
  resolveVideoPlaybackUrl,
  resolveAudioPlaybackUrl,
} from "@/lib/asset-hero";
import { chainLabel, isWeb3Enabled, txUrl } from "@/lib/web3/chains";
import { format } from "date-fns";

type Params = { handle: string; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { handle, slug } = await params;
  const data = await getAssetByOwnerAndSlug(handle, slug);
  if (!data) return { title: "Asset not found" };
  const { asset, owner } = data;
  const title = asset.title;
  const description = asset.description?.slice(0, 200) ?? `A digital asset by @${owner.handle}.`;
  const ogImage =
    (await resolveImageHeroUrl(
      {
        thumbnail_path: asset.thumbnail_path,
        file_path: asset.file_path,
        mime_type: asset.mime_type,
        status: asset.status,
      },
      { viewerUserId: null, ownerId: asset.owner_id, forPublicMetadata: true },
    )) ?? undefined;
  return {
    title,
    description,
    openGraph: { title, description, images: ogImage ? [{ url: ogImage }] : undefined },
    twitter: { card: ogImage ? "summary_large_image" : "summary", title, description },
  };
}

export default async function AssetDetailPage({ params }: { params: Promise<Params> }) {
  const { handle, slug } = await params;
  const data = await getAssetByOwnerAndSlug(handle, slug);
  if (!data) notFound();
  const { asset, owner, tags } = data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let liked = false;
  if (user) {
    const { data: existing } = await supabase
      .from("likes")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("asset_id", asset.id)
      .maybeSingle();
    liked = !!existing;
  }

  if (asset.status !== "published" && user?.id !== owner.id) {
    notFound();
  }

  // Bump view count — only after we know this response will render (published or owner viewing draft).
  const { data: viewCountAfter } = await supabase.rpc("increment_view_count", {
    p_asset_id: asset.id,
  });

  const license = ASSET_LICENSES.find((l) => l.id === asset.license);
  const mime = effectiveMimeFromAsset(asset.mime_type, asset.file_path);

  const previewFields = {
    thumbnail_path: asset.thumbnail_path,
    file_path: asset.file_path,
    mime_type: asset.mime_type,
    status: asset.status,
  };
  const viewerOpts = { viewerUserId: user?.id ?? null, ownerId: owner.id };

  const [heroUrl, pdfEmbedUrl, videoPlaybackUrl, audioPlaybackUrl] = await Promise.all([
    resolveImageHeroUrl(previewFields, viewerOpts),
    resolvePdfEmbedUrl(previewFields, viewerOpts),
    resolveVideoPlaybackUrl(previewFields, viewerOpts),
    resolveAudioPlaybackUrl(previewFields, viewerOpts),
  ]);

  const videoPosterUrl =
    isVideoMime(mime) && asset.thumbnail_path ? publicPreviewUrl(asset.thumbnail_path) : null;

  const fallbackHint = assetPreviewFallbackHint(mime);
  const category = (asset as unknown as { category: { name: string; slug: string } | null }).category;

  const web3 = isWeb3Enabled();
  const { data: mintRow } = web3
    ? await supabase
        .from("mints")
        .select("chain_id, contract_address, token_id, tx_hash")
        .eq("asset_id", asset.id)
        .order("minted_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const mint = mintRow as
    | { chain_id: number; contract_address: string; token_id: string; tx_hash: string }
    | null;

  return (
    <div className="container-page py-8">
      <div className="grid gap-8 lg:grid-cols-[1fr,360px]">
        <div className="order-2 lg:order-1">
          <div className="overflow-hidden rounded-lg border bg-muted">
            {isImageMime(mime) && heroUrl ? (
              <Image
                src={heroUrl}
                alt={asset.title}
                width={1600}
                height={1200}
                className="h-auto w-full object-contain"
                unoptimized
                priority
              />
            ) : isPdfMime(mime) && pdfEmbedUrl ? (
              <iframe
                title={asset.title}
                src={`${pdfEmbedUrl}#view=FitH`}
                className="aspect-[4/3] min-h-[min(75vh,720px)] w-full border-0 bg-muted"
              />
            ) : isVideoMime(mime) && videoPlaybackUrl ? (
              <video
                controls
                playsInline
                preload="metadata"
                poster={videoPosterUrl ?? undefined}
                className="max-h-[min(85vh,900px)] w-full bg-black object-contain"
                src={videoPlaybackUrl}
              />
            ) : isAudioMime(mime) && audioPlaybackUrl ? (
              <div className="flex flex-col justify-center gap-5 p-8">
                <MimeIcon mime={mime} className="mx-auto h-14 w-14 text-muted-foreground" />
                <audio controls preload="metadata" className="mx-auto w-full max-w-xl" src={audioPlaybackUrl} />
              </div>
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-4 p-10">
                <MimeIcon mime={mime} className="h-16 w-16 text-muted-foreground" />
                <div className="max-w-md text-center text-sm text-muted-foreground">
                  <p>No inline preview for this type.</p>
                  {fallbackHint ? (
                    <p className="mt-2 text-xs leading-relaxed">{fallbackHint}</p>
                  ) : null}
                  {isImageMime(mime) ? (
                    <p className="mt-2 block text-xs">
                      For images without a thumbnail we try the original — refresh if needed.
                    </p>
                  ) : (
                    <p className="mt-3 text-xs">Use Download to save and open with your preferred app.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {asset.description ? (
            <div className="mt-6">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {asset.description}
              </p>
            </div>
          ) : null}

          {tags.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {tags.map((t) => (
                <Link key={t.id} href={`/t/${t.slug}`}>
                  <Badge variant="outline">#{t.name}</Badge>
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="order-1 space-y-4 lg:order-2">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {category ? (
                <Link href={`/c/${category.slug}`} className="hover:text-foreground">
                  {category.name}
                </Link>
              ) : (
                "Asset"
              )}
            </div>
            <h1 className="mt-1 text-2xl font-semibold leading-tight">{asset.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {asset.status === "draft" ? (
                <Badge variant="warning">Draft (only visible to you)</Badge>
              ) : null}
              {mint ? (
                <a
                  href={txUrl(mint.chain_id, mint.tx_hash) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Badge variant="secondary" className="gap-1">
                    <Coins className="size-3" aria-hidden /> Minted on {chainLabel(mint.chain_id)}
                  </Badge>
                </a>
              ) : null}
            </div>
          </div>

          <Card>
            <CardContent className="grid gap-4 p-4">
              <Link
                href={`/u/${owner.handle}`}
                className="flex items-center gap-3 rounded-md p-2 -m-2 transition-colors hover:bg-accent"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={owner.avatar_url ?? undefined} alt="" />
                  <AvatarFallback>
                    {(owner.display_name ?? owner.handle)[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {owner.display_name ?? `@${owner.handle}`}
                  </div>
                  <div className="text-xs text-muted-foreground">@{owner.handle}</div>
                </div>
              </Link>

              <div className="flex items-center gap-2">
                <Button asChild className="flex-1">
                  <a href={`/api/download/${asset.id}`} rel="nofollow">
                    <Download className="h-4 w-4" /> Download
                  </a>
                </Button>
                <LikeButton
                  assetId={asset.id}
                  initialLiked={liked}
                  initialCount={asset.like_count}
                  signedIn={!!user}
                />
              </div>

              <Separator />

              <dl className="grid grid-cols-2 gap-y-3 text-sm">
                <DT label="License">
                  {license?.url ? (
                    <a
                      href={license.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium hover:underline"
                    >
                      {license.id}
                    </a>
                  ) : (
                    <span className="font-medium">{asset.license}</span>
                  )}
                </DT>
                <DT label="Type">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {mime.split("/")[0]}
                  </span>
                </DT>
                <DT label="Size">{formatBytes(asset.size_bytes)}</DT>
                <DT label="Downloads">{formatNumber(asset.download_count)}</DT>
                <DT label="Views">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3" />{" "}
                    {formatNumber(
                      typeof viewCountAfter === "number" ? viewCountAfter : asset.view_count,
                    )}
                  </span>
                </DT>
                <DT label="Published">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {format(new Date(asset.created_at), "MMM d, yyyy")}
                  </span>
                </DT>
              </dl>

              {user?.id === owner.id ? (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/assets/${asset.id}`}>Edit</Link>
                    </Button>
                    <DeleteAssetForm
                      assetId={asset.id}
                      variant="destructive"
                      size="sm"
                      showLabel
                      buttonClassName="w-full"
                    />
                  </div>
                </>
              ) : null}

              <Separator />

              <div className="flex justify-between">
                <ReportDialog assetId={asset.id} />
                <Button asChild variant="ghost" size="sm">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      `${asset.title} on ${siteConfig.name}`,
                    )}&url=${encodeURIComponent(`${siteConfig.url}/a/${owner.handle}/${asset.slug}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Share
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function DT({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
