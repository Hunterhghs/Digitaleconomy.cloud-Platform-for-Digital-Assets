"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/sonner";
import { Wallet, Loader2 } from "lucide-react";

interface EthereumProvider {
  request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const SITE_NAME = "DigitalEconomy.cloud";
const STATEMENT =
  "Sign in to DigitalEconomy.cloud to link this wallet to your account. This signature does not authorize any transaction.";

function buildMessage(args: {
  address: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
}): string {
  const domain = typeof window !== "undefined" ? window.location.host : "";
  const uri = typeof window !== "undefined" ? window.location.origin : "";
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    args.address,
    "",
    STATEMENT,
    "",
    `URI: ${uri}`,
    `Version: 1`,
    `Chain ID: ${args.chainId}`,
    `Nonce: ${args.nonce}`,
    `Issued At: ${args.issuedAt}`,
    `Expiration Time: ${args.expirationTime}`,
  ].join("\n");
}

export function WalletConnectButton({ makePrimary = false }: { makePrimary?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function handleConnect() {
    if (typeof window === "undefined" || !window.ethereum) {
      toast({
        title: "No wallet detected",
        description: "Install MetaMask, Rainbow, or Coinbase Wallet, then try again.",
        variant: "error",
      });
      return;
    }

    setBusy(true);
    try {
      const accounts = (await window.ethereum.request<string[]>({
        method: "eth_requestAccounts",
      })) as string[];
      const address = accounts?.[0];
      if (!address) throw new Error("No account returned by wallet.");

      const chainHex = (await window.ethereum.request<string>({
        method: "eth_chainId",
      })) as string;
      const chainId = parseInt(chainHex, 16);

      const nonceRes = await fetch("/api/web3/siwe/nonce", { cache: "no-store" });
      if (!nonceRes.ok) throw new Error("Failed to get nonce.");
      const { nonce, issuedAt, expiresAt } = (await nonceRes.json()) as {
        nonce: string;
        issuedAt: string;
        expiresAt: string;
      };

      const message = buildMessage({
        address,
        chainId,
        nonce,
        issuedAt,
        expirationTime: expiresAt,
      });

      const signature = (await window.ethereum.request<`0x${string}`>({
        method: "personal_sign",
        params: [message, address],
      })) as `0x${string}`;

      const verifyRes = await fetch("/api/web3/siwe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature, nonce, chainId, makePrimary }),
      });

      if (!verifyRes.ok) {
        const { error } = (await verifyRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(error || "Verification failed.");
      }

      toast({
        title: "Wallet linked",
        description: `${SITE_NAME} is now linked to ${address.slice(0, 6)}…${address.slice(-4)}.`,
        variant: "success",
      });
      startTransition(() => router.refresh());
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Wallet connection cancelled.";
      toast({ title: "Couldn't link wallet", description: message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button onClick={handleConnect} disabled={busy} className="gap-2">
      {busy ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Wallet className="size-4" aria-hidden />
      )}
      {busy ? "Confirm in wallet…" : "Connect wallet"}
    </Button>
  );
}
