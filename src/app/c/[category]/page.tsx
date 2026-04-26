import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AssetGrid } from "@/components/asset-grid";
import { getCategories, listAssets } from "@/lib/queries";

type Params = { category: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { category } = await params;
  const cats = await getCategories();
  const cat = cats.find((c) => c.slug === category);
  return { title: cat ? cat.name : "Category" };
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { category } = await params;
  const cats = await getCategories();
  const cat = cats.find((c) => c.slug === category);
  if (!cat) notFound();
  const assets = await listAssets({ category, sort: "new", limit: 36 });

  return (
    <div className="container-page py-10">
      <Link href="/explore" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Explore
      </Link>
      <h1 className="text-2xl font-semibold">{cat.name}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {assets.length} {assets.length === 1 ? "asset" : "assets"}
      </p>
      <AssetGrid assets={assets} empty={`No ${cat.name.toLowerCase()} yet.`} />
    </div>
  );
}
