import { AssetCard, type AssetCardData } from "@/components/asset-card";

export function AssetGrid({ assets, empty }: { assets: AssetCardData[]; empty?: React.ReactNode }) {
  if (!assets || assets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-12 text-center text-sm text-muted-foreground">
        {empty ?? "No assets to show yet."}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {assets.map((a) => (
        <AssetCard key={a.id} asset={a} />
      ))}
    </div>
  );
}
