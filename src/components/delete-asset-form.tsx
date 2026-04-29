"use client";

import type { ComponentProps } from "react";
import { deleteAsset } from "@/app/(app)/upload/_actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

export function DeleteAssetForm({
  assetId,
  variant = "ghost",
  size = "icon",
  showLabel = false,
  className,
  buttonClassName,
}: {
  assetId: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  showLabel?: boolean;
  className?: string;
  buttonClassName?: string;
}) {
  return (
    <form
      action={deleteAsset}
      className={cn(className)}
      onSubmit={(e) => {
        if (
          !confirm(
            "Delete this asset permanently? Stored files and the public listing will be removed. This cannot be undone.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={assetId} />
      <Button
        type="submit"
        variant={variant}
        size={size}
        className={buttonClassName}
        aria-label={showLabel ? undefined : "Delete asset"}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        {showLabel ? <span className="ml-2">Delete</span> : null}
      </Button>
    </form>
  );
}
