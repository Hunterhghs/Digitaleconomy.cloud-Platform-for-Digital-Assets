"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/sonner";
import { setPrimaryWallet, unlinkWallet } from "./_actions";
import { explorerForChain, shortAddress } from "@/lib/web3/chains";
import { Star, Trash2, ExternalLink } from "lucide-react";

export interface WalletRowProps {
  id: string;
  address: string;
  chainId: number;
  chainLabel: string;
  isPrimary: boolean;
  verifiedAt: string;
}

export function WalletRow(props: WalletRowProps) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const explorer = explorerForChain(props.chainId);

  function onPrimary() {
    start(async () => {
      const res = await setPrimaryWallet(props.id);
      if (res?.error) toast({ title: "Update failed", description: res.error, variant: "error" });
      else toast({ title: "Primary wallet updated", variant: "success" });
    });
  }

  function onUnlink() {
    if (!confirm("Unlink this wallet from your account?")) return;
    start(async () => {
      const res = await unlinkWallet(props.id);
      if (res?.error) toast({ title: "Unlink failed", description: res.error, variant: "error" });
      else toast({ title: "Wallet unlinked", variant: "success" });
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <code className="font-mono text-sm">{shortAddress(props.address)}</code>
          {props.isPrimary && <Badge variant="secondary">Primary</Badge>}
          <Badge variant="outline">{props.chainLabel}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Verified {new Date(props.verifiedAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {explorer && (
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a
              href={`${explorer}/address/${props.address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              Explorer
            </a>
          </Button>
        )}
        {!props.isPrimary && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPrimary}
            disabled={pending}
            className="gap-1.5"
          >
            <Star className="size-3.5" aria-hidden />
            Make primary
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onUnlink}
          disabled={pending}
          className="gap-1.5 text-destructive hover:text-destructive"
        >
          <Trash2 className="size-3.5" aria-hidden />
          Unlink
        </Button>
      </div>
    </div>
  );
}
