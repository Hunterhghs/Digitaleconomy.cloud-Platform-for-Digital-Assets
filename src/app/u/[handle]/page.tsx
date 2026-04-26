import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AssetGrid } from "@/components/asset-grid";
import { getProfileByHandle, listAssets, getCurrentProfile } from "@/lib/queries";
import { siteConfig } from "@/lib/site";

type Params = { handle: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) return { title: "Creator not found" };
  const title = `${profile.display_name ?? "@" + profile.handle} (@${profile.handle})`;
  return {
    title,
    description: profile.bio ?? `Digital assets shared by ${title} on ${siteConfig.name}.`,
    openGraph: { title, description: profile.bio ?? undefined },
  };
}

export default async function ProfilePage({ params }: { params: Promise<Params> }) {
  const { handle } = await params;
  const [profile, current] = await Promise.all([getProfileByHandle(handle), getCurrentProfile()]);
  if (!profile) notFound();
  const assets = await listAssets({ ownerHandle: handle, limit: 24 });
  const isOwn = current?.id === profile.id;

  return (
    <div className="container-page py-10">
      <div className="flex flex-col items-start gap-6 md:flex-row md:items-end">
        <Avatar className="h-24 w-24">
          <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
          <AvatarFallback className="text-3xl">
            {(profile.display_name ?? profile.handle)[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">
            {profile.display_name ?? `@${profile.handle}`}
          </h1>
          <p className="text-sm text-muted-foreground">@{profile.handle}</p>
          {profile.bio ? <p className="mt-3 max-w-2xl text-sm">{profile.bio}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {isOwn ? (
            <Button asChild variant="outline">
              <Link href="/settings">Edit profile</Link>
            </Button>
          ) : null}
        </div>
      </div>
      <div className="mt-10">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Assets
        </h2>
        <AssetGrid
          assets={assets}
          empty={isOwn ? "You haven't published anything yet." : "This creator has nothing published yet."}
        />
      </div>
    </div>
  );
}
