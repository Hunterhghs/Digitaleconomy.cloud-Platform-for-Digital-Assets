"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProfile, type SettingsState } from "./_actions";

const FORM_ID = "profile-settings-form";

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
    <>
      <form id={FORM_ID} action={action} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="handle">Handle</Label>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <span className="inline-flex shrink-0 items-center rounded-md border border-input bg-muted px-3 py-2 text-xs text-muted-foreground sm:rounded-r-none sm:text-sm">
              digitaleconomy.cloud/u/
            </span>
            <Input
              id="handle"
              name="handle"
              defaultValue={defaults.handle}
              className="min-w-0 sm:rounded-l-none"
              required
              minLength={3}
              maxLength={24}
              pattern="^[a-zA-Z0-9_]+$"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
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

        <div className="hidden md:block">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </form>

      {/* Mobile: sticky submit — duplicate controls tied to the same form via form="" */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
        <Button type="submit" form={FORM_ID} className="w-full" disabled={pending} size="lg">
          {pending ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </>
  );
}
