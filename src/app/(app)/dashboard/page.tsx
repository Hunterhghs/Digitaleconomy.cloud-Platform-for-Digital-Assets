import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Eye, Download, Heart, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetGrid } from "@/components/asset-grid";
import { DeleteAssetForm } from "@/components/delete-asset-form";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentUser, buildAssetCardData } from "@/lib/queries";
import { effectiveMimeFromAsset } from "@/lib/mime-normalize";
import { format } from "date-fns";
import { formatBytes, formatNumber } from "@/lib/utils";
import { deleteCollection } from "@/app/(app)/_actions/collections";
import { CreateCollectionDialog } from "./create-collection";
import type { AssetCardData } from "@/components/asset-card";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    const user = await getCurrentUser();
    if (!user) redirect("/login?next=/dashboard");
    redirect("/settings?notice=" + encodeURIComponent("Choose a handle to finish setting up your account."));
  }

  const supabase = await createClient();

  const { data: myAssets } = await supabase
    .from("assets")
    .select(
      "id, slug, title, mime_type, size_bytes, license, status, download_count, view_count, like_count, thumbnail_path, file_path, created_at",
    )
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: likedRaw } = await supabase
    .from("likes")
    .select(
      "asset:assets(id, slug, title, mime_type, size_bytes, thumbnail_path, file_path, license, download_count, view_count, like_count, owner:profiles!assets_owner_id_fkey(handle, display_name, avatar_url))",
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(36);

  const liked: AssetCardData[] = (
    await Promise.all(
      (likedRaw ?? []).map(async (l) => {
        const a = Array.isArray(l.asset) ? l.asset[0] : l.asset;
        if (!a) return null;
        const owner = Array.isArray(a.owner) ? a.owner[0] : a.owner;
        if (!owner) return null;
        return buildAssetCardData({
          id: a.id,
          slug: a.slug,
          title: a.title,
          mime_type: a.mime_type,
          size_bytes: a.size_bytes,
          thumbnail_path: a.thumbnail_path,
          file_path: a.file_path ?? null,
          license: a.license,
          download_count: a.download_count,
          view_count: a.view_count,
          like_count: a.like_count,
          owner,
        });
      }),
    )
  ).filter((x): x is AssetCardData => x !== null);

  const { data: collections } = await supabase
    .from("collections")
    .select("id, name, slug, is_public, created_at")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false });

  const totalDownloads = (myAssets ?? []).reduce((s, a) => s + (a.download_count ?? 0), 0);
  const totalLikes = (myAssets ?? []).reduce((s, a) => s + (a.like_count ?? 0), 0);
  const totalViews = (myAssets ?? []).reduce((s, a) => s + (a.view_count ?? 0), 0);

  return (
    <div className="container-page py-10">
      <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Hello, {profile.display_name ?? profile.handle}.
          </p>
        </div>
        <Button asChild>
          <Link href="/upload">
            <Plus className="h-4 w-4" /> Upload an asset
          </Link>
        </Button>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={<Eye className="h-4 w-4" />} label="Views" value={formatNumber(totalViews)} />
        <Stat icon={<Download className="h-4 w-4" />} label="Downloads" value={formatNumber(totalDownloads)} />
        <Stat icon={<Heart className="h-4 w-4" />} label="Likes" value={formatNumber(totalLikes)} />
        <Stat icon={<Plus className="h-4 w-4" />} label="Assets" value={formatNumber(myAssets?.length ?? 0)} />
      </div>

      <Tabs defaultValue="assets">
        <TabsList>
          <TabsTrigger value="assets">My assets</TabsTrigger>
          <TabsTrigger value="liked">Liked</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
        </TabsList>

        <TabsContent value="assets">
          {!myAssets || myAssets.length === 0 ? (
            <EmptyState
              title="No assets yet"
              body="Upload your first asset to share it with the community."
              action={
                <Button asChild>
                  <Link href="/upload">
                    <Plus className="h-4 w-4" /> Upload an asset
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Views</th>
                    <th className="px-4 py-3 text-right">Downloads</th>
                    <th className="px-4 py-3 text-right">Likes</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {myAssets.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="max-w-[280px] px-4 py-3">
                        <Link
                          href={`/a/${profile.handle}/${a.slug}`}
                          className="line-clamp-1 font-medium hover:underline"
                        >
                          {a.title}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {effectiveMimeFromAsset(a.mime_type, a.file_path)} · {formatBytes(a.size_bytes)} · {a.license}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={a.status === "published" ? "success" : a.status === "draft" ? "warning" : "destructive"}>
                          {a.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">{formatNumber(a.view_count)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(a.download_count)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(a.like_count)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(a.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="icon" aria-label="Edit">
                            <Link href={`/dashboard/assets/${a.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <DeleteAssetForm assetId={a.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="liked">
          <AssetGrid
            assets={liked}
            empty="You haven't liked anything yet. Hit the heart on any asset you love."
          />
        </TabsContent>

        <TabsContent value="collections">
          <div className="mb-4 flex justify-end">
            <CreateCollectionDialog />
          </div>
          {!collections || collections.length === 0 ? (
            <EmptyState
              title="No collections yet"
              body="Group assets you love into named collections to share or save for later."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {collections.map((c) => (
                <Card key={c.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.is_public ? "Public" : "Private"} · created {format(new Date(c.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                    <form action={deleteCollection}>
                      <input type="hidden" name="id" value={c.id} />
                      <Button type="submit" variant="ghost" size="icon" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          {icon} {label}
        </div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-12 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
