"use client";

import { useTransition, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { uploadAvatar } from "./_actions";

export function AvatarUploader({
  initialUrl,
  fallback,
}: {
  initialUrl: string | null;
  fallback: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [url, setUrl] = useState(initialUrl);

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-16 w-16">
        <AvatarImage src={url ?? undefined} alt="" />
        <AvatarFallback className="text-xl">{fallback.toUpperCase()}</AvatarFallback>
      </Avatar>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const res = await uploadAvatar(fd);
            setMessage(res.message ?? null);
            if (res.ok) {
              const file = fd.get("avatar") as File | null;
              if (file) setUrl(URL.createObjectURL(file));
            }
          });
        }}
        className="flex items-center gap-2"
      >
        <input
          name="avatar"
          type="file"
          accept="image/*"
          className="block w-full max-w-xs text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-secondary/80"
          required
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Uploading..." : "Upload"}
        </Button>
      </form>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
