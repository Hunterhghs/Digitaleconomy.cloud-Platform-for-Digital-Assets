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
import { MimeIcon } from "@/components/asset-card";
import {
  formatBytes,
  formatNumber,
  isImageMime,
  isAudioMime,
  isVideoMime,
} from "@/lib/utils";
import { ASSET_LICENSES, siteConfig } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { getAssetByOwnerAndSlug, publicPreviewUrl } from "@/lib/queries";
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
  const ogImage = publicPreviewUrl(asset.thumbnail_path) ?? undefined;
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

  // Bump view count via SECURITY DEFINER RPC so anonymous and non-owner
  // viewers can also increment it (direct UPDATE is blocked by RLS).
  await supabase.rpc("increment_view_count", { p_asset_id: asset.id });

  if (asset.status !== "published" && user?.id !== owner.id) {
    notFound();
  }

  const license = ASSET_LICENSES.find((l) => l.id === asset.license);
  const previewUrl = publicPreviewUrl(asset.thumbnail_path);
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
        <div>
          <div className="overflow-hidden rounded-lg border bg-muted">
            {isImageMime(asset.mime_type) && previewUrl ? (
              <Image
                src={previewUrl}
                alt={asset.title}
                width={1600}
                height={1200}
                className="h-auto w-full object-contain"
                unoptimized
                priority
              />
            ) : isAudioMime(asset.mime_type) ? (
              <div className="flex aspect-video flex-col items-center justify-center gap-4 p-10">
                <MimeIcon mime={asset.mime_type} className="h-16 w-16 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Audio preview is generated after download approval.
                </p>
              </div>
            ) : isVideoMime(asset.mime_type) && previewUrl ? (
              <Image
                src={previewUrl}
                alt={asset.title}
                width={1600}
                height={900}
                className="h-auto w-full"
                unoptimized
              />
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-4 p-10">
                <MimeIcon mime={asset.mime_type} className="h-16 w-16 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  No inline preview available for {asset.mime_type}
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

        <aside className="space-y-4">
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
                    {asset.mime_type.split("/")[0]}
                  </span>
                </DT>
                <DT label="Size">{formatBytes(asset.size_bytes)}</DT>
                <DT label="Downloads">{formatNumber(asset.download_count)}</DT>
                <DT label="Views">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {formatNumber(asset.view_count + 1)}
                  </span>
                </DT>
                <DT label="Published">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {format(new Date(asset.created_at), "MMM d, yyyy")}
                  </span>
                </DT>
              </dl>

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
