import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AssetGrid } from "@/components/asset-grid";
import { listAssets } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

type Params = { tag: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${tag}` };
}

export default async function TagPage({ params }: { params: Promise<Params> }) {
  const { tag } = await params;
  const supabase = await createClient();
  const { data: tagRow } = await supabase
    .from("tags")
    .select("name, slug")
    .eq("slug", tag)
    .maybeSingle();

  const assets = await listAssets({ tag, sort: "new", limit: 36 });

  return (
    <div className="container-page py-10">
      <Link
        href="/explore"
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Explore
      </Link>
      <h1 className="text-2xl font-semibold">#{tagRow?.name ?? tag}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {assets.length} {assets.length === 1 ? "asset" : "assets"}
      </p>
      <AssetGrid assets={assets} empty={`No assets tagged #${tagRow?.name ?? tag} yet.`} />
    </div>
  );
}
