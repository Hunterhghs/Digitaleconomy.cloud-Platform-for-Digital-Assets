import Link from "next/link";
import { AssetGrid } from "@/components/asset-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCategories, listAssets, type ExploreSort } from "@/lib/queries";
import { ASSET_LICENSES } from "@/lib/site";

export const metadata = { title: "Explore" };

const SORTS: { id: ExploreSort; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "new", label: "Newest" },
  { id: "downloads", label: "Most downloaded" },
];

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = pickString(params.q);
  const sort = (pickString(params.sort) as ExploreSort) || "new";
  const license = pickString(params.license);
  const category = pickString(params.category);

  const [assets, categories] = await Promise.all([
    listAssets({ q, sort, license, category, limit: 36 }),
    getCategories(),
  ]);

  return (
    <div className="container-page py-10">
      <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{q ? `Results for “${q}”` : "Explore"}</h1>
          <p className="text-sm text-muted-foreground">
            {assets.length} {assets.length === 1 ? "asset" : "assets"} shown
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {SORTS.map((s) => (
            <FilterChip
              key={s.id}
              href={mergeQS(params, { sort: s.id })}
              active={sort === s.id}
            >
              {s.label}
            </FilterChip>
          ))}
        </div>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-[220px,1fr]">
        <aside className="space-y-6">
          <FilterGroup title="Category">
            <FilterChip href={mergeQS(params, { category: "" })} active={!category}>
              All
            </FilterChip>
            {categories.map((c) => (
              <FilterChip
                key={c.id}
                href={mergeQS(params, { category: c.slug })}
                active={category === c.slug}
              >
                {c.name}
              </FilterChip>
            ))}
          </FilterGroup>
          <FilterGroup title="License">
            <FilterChip href={mergeQS(params, { license: "" })} active={!license}>
              All
            </FilterChip>
            {ASSET_LICENSES.map((l) => (
              <FilterChip
                key={l.id}
                href={mergeQS(params, { license: l.id })}
                active={license === l.id}
              >
                {l.id}
              </FilterChip>
            ))}
          </FilterGroup>
          {(q || license || category || sort !== "new") && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/explore">Clear filters</Link>
            </Button>
          )}
        </aside>
        <AssetGrid assets={assets} empty="No assets match these filters yet." />
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Badge variant={active ? "default" : "outline"} className="cursor-pointer">
        {children}
      </Badge>
    </Link>
  );
}

function pickString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value && value.length > 0 ? value : undefined;
}

function mergeQS(
  current: Record<string, string | string[] | undefined>,
  patch: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    const s = pickString(v);
    if (s) params.set(k, s);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (!v) params.delete(k);
    else params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/explore?${qs}` : "/explore";
}
