"use client";

import { useTransition, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatNumber } from "@/lib/utils";
import { toggleLike } from "@/app/(app)/_actions/engagement";
import { useToast } from "@/components/ui/sonner";

export function LikeButton({
  assetId,
  initialLiked,
  initialCount,
  signedIn,
}: {
  assetId: string;
  initialLiked: boolean;
  initialCount: number;
  signedIn: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, start] = useTransition();
  const { toast } = useToast();

  return (
    <Button
      variant={liked ? "default" : "outline"}
      size="sm"
      onClick={() =>
        start(async () => {
          if (!signedIn) {
            toast({ title: "Sign in to like assets", variant: "default" });
            return;
          }
          const optimistic = !liked;
          setLiked(optimistic);
          setCount((c) => Math.max(0, c + (optimistic ? 1 : -1)));
          const res = await toggleLike(assetId);
          if (!res.ok) {
            setLiked(!optimistic);
            setCount((c) => Math.max(0, c + (optimistic ? -1 : 1)));
            toast({ title: "Couldn't update like", description: res.message, variant: "error" });
          }
        })
      }
      disabled={pending}
    >
      <Heart className={cn("h-4 w-4", liked && "fill-current")} />
      {formatNumber(count)}
    </Button>
  );
}
