import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { WalletConnectButton } from "@/components/wallet-connect";
import { WalletRow } from "./wallet-row";
import { chainLabel, isWeb3Enabled } from "@/lib/web3/chains";
import { ShieldCheck } from "lucide-react";

export const metadata = { title: "Wallets" };

export default async function WalletsSettingsPage() {
  if (!isWeb3Enabled()) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings/wallet");

  const { data: walletsRaw } = await supabase
    .from("wallets")
    .select("id, address, chain_id, is_primary, verified_at")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("verified_at", { ascending: false });

  const wallets =
    (walletsRaw as
      | { id: string; address: string; chain_id: number; is_primary: boolean; verified_at: string }[]
      | null) ?? [];

  return (
    <div className="container-page max-w-3xl py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link href="/settings" className="text-sm text-muted-foreground hover:underline">
            ← Settings
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Linked wallets</h1>
          <p className="text-sm text-muted-foreground">
            Use any EVM wallet (MetaMask, Rainbow, Coinbase, etc.) to verify on-chain ownership.
          </p>
        </div>
        <WalletConnectButton makePrimary={wallets.length === 0} />
      </div>

      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4" aria-hidden /> What this does
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          We use Sign-In With Ethereum (EIP-4361). You sign a one-time message with your wallet — no
          gas, no transaction. The signature proves you control the address, and we record it
          alongside your account so you can mint or attribute assets on-chain.
        </CardContent>
      </Card>

      {wallets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No wallets linked yet. Click <strong>Connect wallet</strong> above to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {wallets.map((w) => (
            <WalletRow
              key={w.id}
              id={w.id}
              address={w.address}
              chainId={w.chain_id}
              chainLabel={chainLabel(w.chain_id)}
              isPrimary={w.is_primary}
              verifiedAt={w.verified_at}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
