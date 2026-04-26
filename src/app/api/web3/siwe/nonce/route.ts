import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { isWeb3Enabled } from "@/lib/web3/chains";

export const runtime = "nodejs";

const NONCE_TTL_MS = 5 * 60 * 1000;

export async function GET() {
  if (!isWeb3Enabled()) {
    return NextResponse.json({ error: "web3 disabled" }, { status: 404 });
  }

  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + NONCE_TTL_MS);

  const admin = createAdminClient();
  const { error } = await admin.from("siwe_nonces").insert({
    nonce,
    issued_at: issuedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: "failed to issue nonce" }, { status: 500 });
  }

  return NextResponse.json({
    nonce,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
}
