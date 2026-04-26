import { NextResponse } from "next/server";
import { getAddress, isAddress, verifyMessage } from "viem";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { buildSiweMessage } from "@/lib/web3/siwe";
import { getDefaultChain, isWeb3Enabled } from "@/lib/web3/chains";

export const runtime = "nodejs";

interface VerifyBody {
  address?: string;
  signature?: string;
  nonce?: string;
  chainId?: number;
  makePrimary?: boolean;
}

export async function POST(req: Request) {
  if (!isWeb3Enabled()) {
    return NextResponse.json({ error: "web3 disabled" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as VerifyBody;
  const { address, signature, nonce, chainId, makePrimary } = body;

  if (!address || !signature || !nonce || typeof chainId !== "number") {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (!isAddress(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: nonceRow, error: nonceErr } = await admin
    .from("siwe_nonces")
    .select("nonce, issued_at, expires_at, consumed_at")
    .eq("nonce", nonce)
    .maybeSingle();

  if (nonceErr || !nonceRow) {
    return NextResponse.json({ error: "unknown nonce" }, { status: 400 });
  }
  if (nonceRow.consumed_at) {
    return NextResponse.json({ error: "nonce already used" }, { status: 400 });
  }
  if (new Date(nonceRow.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "nonce expired" }, { status: 400 });
  }

  const checksummed = getAddress(address);
  const message = buildSiweMessage({
    address: checksummed,
    chainId,
    nonce,
    issuedAt: nonceRow.issued_at,
    expirationTime: nonceRow.expires_at,
  });

  const valid = await verifyMessage({
    address: checksummed,
    message,
    signature: signature as `0x${string}`,
  }).catch(() => false);

  if (!valid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  await admin
    .from("siwe_nonces")
    .update({ consumed_at: new Date().toISOString() })
    .eq("nonce", nonce);

  if (makePrimary) {
    await admin.from("wallets").update({ is_primary: false }).eq("user_id", user.id);
  }

  const { data: existing } = await admin
    .from("wallets")
    .select("id, user_id")
    .eq("address", checksummed)
    .eq("chain_id", chainId)
    .maybeSingle();

  if (existing && existing.user_id !== user.id) {
    return NextResponse.json(
      { error: "wallet already linked to another account" },
      { status: 409 },
    );
  }

  const { error: upsertErr } = await admin.from("wallets").upsert(
    {
      user_id: user.id,
      address: checksummed,
      chain_id: chainId,
      is_primary: !!makePrimary,
      verified_at: new Date().toISOString(),
    },
    { onConflict: "address,chain_id" },
  );

  if (upsertErr) {
    return NextResponse.json({ error: "failed to save wallet" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    address: checksummed,
    chainId,
    chain: getDefaultChain().name,
  });
}
