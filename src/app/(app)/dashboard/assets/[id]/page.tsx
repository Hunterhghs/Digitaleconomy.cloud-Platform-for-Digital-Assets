import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Coins } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getCategories, getCurrentProfile, getCurrentUser } from "@/lib/queries";
import { EditAssetForm } from "./edit-form";
import { MintRecorder } from "@/components/mint-recorder";
import { chainLabel, isWeb3Enabled, txUrl } from "@/lib/web3/chains";

export const metadata = { title: "Edit asset" };

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) {
    const user = await getCurrentUser();
    if (!user) redirect(`/login?next=/dashboard/assets/${id}`);
    redirect("/settings?notice=" + encodeURIComponent("Choose a handle to finish setting up your account."));
  }

  const supabase = await createClient();
  const { data: asset } = await supabase
    .from("assets")
    .select("id, owner_id, title, description, license, status, category_id")
    .eq("id", id)
    .maybeSingle();
  if (!asset || asset.owner_id !== profile.id) notFound();

  const { data: tagLinks } = await supabase
    .from("asset_tags")
    .select("tag:tags(name)")
    .eq("asset_id", id);
  const tags = (tagLinks ?? [])
    .map((t) => (Array.isArray(t.tag) ? t.tag[0] : t.tag))
    .filter(Boolean)
    .map((t: { name: string }) => t.name);

  const categories = await getCategories();

  const web3 = isWeb3Enabled();
  const { data: mintsRaw } = web3
    ? await supabase
        .from("mints")
        .select("id, chain_id, contract_address, token_id, tx_hash, minted_at")
        .eq("asset_id", id)
        .order("minted_at", { ascending: false })
    : { data: null };
  const mints =
    (mintsRaw as
      | {
          id: string;
          chain_id: number;
          contract_address: string;
          token_id: string;
          tx_hash: string;
          minted_at: string;
        }[]
      | null) ?? [];

  return (
    <div className="container-page max-w-3xl py-10">
      <Link
        href="/dashboard"
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Dashboard
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Edit asset</CardTitle>
        </CardHeader>
        <CardContent>
          <EditAssetForm
            defaults={{
              id: asset.id,
              title: asset.title,
              description: asset.description,
              license: asset.license,
              category_id: asset.category_id,
              status: asset.status === "removed" ? "draft" : asset.status,
              tags,
            }}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          />
        </CardContent>
      </Card>

      {web3 && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Coins className="size-4" aria-hidden /> On-chain mints
              </CardTitle>
              <CardDescription>
                Record a mint after you publish this asset as an NFT. The badge appears on the
                public asset page.
              </CardDescription>
            </div>
            <MintRecorder assetId={asset.id} />
          </CardHeader>
          <CardContent>
            {mints.length === 0 ? (
              <p className="text-sm text-muted-foreground">No mints recorded yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {mints.map((m) => {
                  const url = txUrl(m.chain_id, m.tx_hash);
                  return (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{chainLabel(m.chain_id)}</Badge>
                          <code className="font-mono text-xs">
                            {m.contract_address.slice(0, 6)}…{m.contract_address.slice(-4)}
                          </code>
                          <span className="text-muted-foreground">#{m.token_id}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Minted {new Date(m.minted_at).toLocaleDateString()}
                        </p>
                      </div>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium underline-offset-4 hover:underline"
                        >
                          View transaction →
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
