"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProfile, type SettingsState } from "./_actions";

const initial: SettingsState = { ok: false };

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-xs text-destructive">{error}</p>;
}

export function ProfileForm({
  defaults,
}: {
  defaults: { handle: string; display_name: string | null; bio: string | null; website: string | null };
}) {
  const [state, action, pending] = useActionState(updateProfile, initial);
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="handle">Handle</Label>
        <div className="flex">
          <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
            digitaleconomy.cloud/u/
          </span>
          <Input
            id="handle"
            name="handle"
            defaultValue={defaults.handle}
            className="rounded-l-none"
            required
            minLength={3}
            maxLength={24}
            pattern="^[a-zA-Z0-9_]+$"
          />
        </div>
        <FieldError error={state?.fieldErrors?.handle} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="display_name">Display name</Label>
        <Input id="display_name" name="display_name" defaultValue={defaults.display_name ?? ""} />
        <FieldError error={state?.fieldErrors?.display_name} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={280}
          defaultValue={defaults.bio ?? ""}
          placeholder="Tell people about you and the work you share."
        />
        <FieldError error={state?.fieldErrors?.bio} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          name="website"
          type="url"
          defaultValue={defaults.website ?? ""}
          placeholder="https://example.com"
        />
        <FieldError error={state?.fieldErrors?.website} />
      </div>

      {state?.message ? (
        <p
          className={`rounded-md border px-3 py-2 text-sm ${
            state.ok
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
