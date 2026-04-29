import Link from "next/link";
import Image from "next/image";
import { Download, Eye, Heart, FileText, Music, Video, Box, Image as ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, formatBytes, formatNumber, isImageMime, isAudioMime, isVideoMime } from "@/lib/utils";

export type AssetCardData = {
  id: string;
  slug: string;
  title: string;
  mime_type: string;
  size_bytes: number;
  thumbnail_url: string | null;
  /** Signed original URL when no raster thumbnail (short TTL); use with card_preview_kind */
  card_preview_url?: string | null;
  card_preview_kind?: "image" | "video" | "pdf" | null;
  license: string;
  download_count: number;
  view_count: number;
  like_count: number;
  owner: { handle: string; display_name: string | null; avatar_url: string | null };
};

export function AssetCard({ asset, className }: { asset: AssetCardData; className?: string }) {
  const href = `/a/${asset.owner.handle}/${asset.slug}`;
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <CardPreview asset={asset} href={href} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={href} className="line-clamp-1 font-medium hover:underline">
            {asset.title}
          </Link>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <Link
            href={`/u/${asset.owner.handle}`}
            className="flex items-center gap-2 hover:text-foreground"
          >
            <Avatar className="h-5 w-5">
              <AvatarImage src={asset.owner.avatar_url ?? undefined} alt="" />
              <AvatarFallback>{(asset.owner.display_name ?? asset.owner.handle)[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="line-clamp-1">@{asset.owner.handle}</span>
          </Link>
          <div className="flex items-center gap-3">
            <Stat icon={<Heart className="h-3 w-3" />} value={asset.like_count} />
            <Stat icon={<Download className="h-3 w-3" />} value={asset.download_count} />
            <Stat icon={<Eye className="h-3 w-3" />} value={asset.view_count} />
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {formatBytes(asset.size_bytes)} · {asset.mime_type.split("/")[0]}
        </div>
      </div>
    </article>
  );
}

function CardPreview({ asset, href }: { asset: AssetCardData; href: string }) {
  const badge = (
    <Badge variant="secondary" className="pointer-events-none absolute right-2 top-2 z-20 bg-background/80 backdrop-blur">
      {asset.license}
    </Badge>
  );
  const overlay = (
    <Link href={href} className="absolute inset-0 z-10" aria-label={`View ${asset.title}`}>
      <span className="sr-only">{asset.title}</span>
    </Link>
  );

  if (asset.thumbnail_url) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={asset.thumbnail_url}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          unoptimized
        />
        {overlay}
        {badge}
      </div>
    );
  }

  if (asset.card_preview_kind === "image" && asset.card_preview_url) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={asset.card_preview_url}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          unoptimized
        />
        {overlay}
        {badge}
      </div>
    );
  }

  if (asset.card_preview_kind === "video" && asset.card_preview_url) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden bg-black">
        <video
          src={asset.card_preview_url}
          muted
          playsInline
          preload="metadata"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        {overlay}
        {badge}
      </div>
    );
  }

  if (asset.card_preview_kind === "pdf" && asset.card_preview_url) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <iframe
          title=""
          src={`${asset.card_preview_url}#view=FitH`}
          className="pointer-events-none absolute inset-0 h-full w-full border-0 bg-muted"
        />
        {overlay}
        {badge}
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        <MimeIcon mime={asset.mime_type} className="h-10 w-10" />
      </div>
      {overlay}
      {badge}
    </div>
  );
}

function Stat({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      {icon}
      {formatNumber(value)}
    </span>
  );
}

export function MimeIcon({ mime, className }: { mime: string; className?: string }) {
  if (isImageMime(mime)) return <ImageIcon className={className} />;
  if (isAudioMime(mime)) return <Music className={className} />;
  if (isVideoMime(mime)) return <Video className={className} />;
  if (mime?.startsWith("model/")) return <Box className={className} />;
  return <FileText className={className} />;
}
