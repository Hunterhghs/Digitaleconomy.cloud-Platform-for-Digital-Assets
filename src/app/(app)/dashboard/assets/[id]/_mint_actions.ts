"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;

const recordMintSchema = z.object({
  assetId: z.string().uuid(),
  chainId: z.number().int().positive(),
  contractAddress: z.string().regex(ETH_ADDRESS_RE, "Invalid contract address"),
  tokenId: z.string().min(1).max(80),
  txHash: z.string().regex(TX_HASH_RE, "Invalid tx hash"),
  metadataUri: z.string().url().or(z.string().startsWith("ipfs://")).optional(),
  blockNumber: z.number().int().nonnegative().optional(),
});

export type RecordMintInput = z.infer<typeof recordMintSchema>;

export async function recordMint(input: RecordMintInput) {
  const parsed = recordMintSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: asset } = await supabase
    .from("assets")
    .select("id, owner_id, slug, owner:profiles!assets_owner_id_fkey(handle)")
    .eq("id", parsed.data.assetId)
    .maybeSingle();

  if (!asset || (asset as { owner_id: string }).owner_id !== user.id) {
    return { error: "You can only record mints for your own assets." };
  }

  const admin = createAdminClient();
  const { data: wallet } = await admin
    .from("wallets")
    .select("id")
    .eq("user_id", user.id)
    .eq("chain_id", parsed.data.chainId)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await admin.from("mints").insert({
    asset_id: parsed.data.assetId,
    owner_id: user.id,
    wallet_id: (wallet as { id: string } | null)?.id ?? null,
    chain_id: parsed.data.chainId,
    contract_address: parsed.data.contractAddress,
    token_id: parsed.data.tokenId,
    tx_hash: parsed.data.txHash,
    metadata_uri: parsed.data.metadataUri ?? null,
    block_number: parsed.data.blockNumber ?? null,
  });

  if (error) return { error: error.message };

  const handle = (asset as { owner?: { handle?: string } }).owner?.handle;
  const slug = (asset as { slug?: string }).slug;
  revalidatePath(`/dashboard/assets/${parsed.data.assetId}`);
  if (handle && slug) revalidatePath(`/a/${handle}/${slug}`);
  return { ok: true };
}
