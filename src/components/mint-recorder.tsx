"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/sonner";
import { Coins } from "lucide-react";
import { recordMint } from "@/app/(app)/dashboard/assets/[id]/_mint_actions";

export function MintRecorder({ assetId }: { assetId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [chainId, setChainId] = useState("84532");
  const [contract, setContract] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [txHash, setTxHash] = useState("");
  const [metadataUri, setMetadataUri] = useState("");

  function reset() {
    setChainId("84532");
    setContract("");
    setTokenId("");
    setTxHash("");
    setMetadataUri("");
  }

  function onSubmit() {
    start(async () => {
      const res = await recordMint({
        assetId,
        chainId: Number(chainId),
        contractAddress: contract.trim(),
        tokenId: tokenId.trim(),
        txHash: txHash.trim(),
        metadataUri: metadataUri.trim() || undefined,
      });
      if (res?.error) {
        toast({ title: "Couldn't record mint", description: res.error, variant: "error" });
        return;
      }
      toast({
        title: "Mint recorded",
        description: "The on-chain badge is now live on this asset.",
        variant: "success",
      });
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Coins className="size-4" aria-hidden /> Record on-chain mint
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record an NFT mint</DialogTitle>
          <DialogDescription>
            Already minted this asset on-chain? Paste the transaction details so we can show a
            verified mint badge on the asset page.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="mint-chain">Chain ID</Label>
            <Input
              id="mint-chain"
              inputMode="numeric"
              value={chainId}
              onChange={(e) => setChainId(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 8453 (Base) or 84532 (Base Sepolia)"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mint-contract">Contract address</Label>
            <Input
              id="mint-contract"
              value={contract}
              onChange={(e) => setContract(e.target.value)}
              placeholder="0x…"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mint-token">Token ID</Label>
            <Input
              id="mint-token"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="1"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mint-tx">Transaction hash</Label>
            <Input
              id="mint-tx"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="0x…"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mint-meta">Metadata URI (optional)</Label>
            <Input
              id="mint-meta"
              value={metadataUri}
              onChange={(e) => setMetadataUri(e.target.value)}
              placeholder="ipfs://… or https://…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={pending}>
            {pending ? "Saving…" : "Record mint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
