"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASSET_LICENSES } from "@/lib/site";
import { updateAssetMeta, type UploadActionState } from "@/app/(app)/upload/_actions";

const initial: UploadActionState = { ok: false };

type Defaults = {
  id: string;
  title: string;
  description: string | null;
  license: string;
  category_id: string | null;
  status: "draft" | "published";
  tags: string[];
};

export function EditAssetForm({
  defaults,
  categories,
}: {
  defaults: Defaults;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateAssetMeta, initial);
  const [status, setStatus] = useState<"draft" | "published">(defaults.status);
  const [license, setLicense] = useState(defaults.license);
  const [categoryId, setCategoryId] = useState(defaults.category_id ?? "");

  return (
    <form
      action={(fd) => {
        fd.set("status", status);
        fd.set("license", license);
        if (categoryId) fd.set("category_id", categoryId);
        action(fd);
        if (state?.ok) router.refresh();
      }}
      className="grid gap-4"
    >
      <input type="hidden" name="id" value={defaults.id} />

      <Field label="Title" error={state?.fieldErrors?.title}>
        <Input name="title" defaultValue={defaults.title} required maxLength={120} />
      </Field>

      <Field label="Description" error={state?.fieldErrors?.description}>
        <Textarea name="description" rows={5} defaultValue={defaults.description ?? ""} />
      </Field>

      <Field label="Category">
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="Pick a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="License">
        <Select value={license} onValueChange={setLicense}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSET_LICENSES.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Tags" hint="Comma-separated, up to 15.">
        <Input name="tags" defaultValue={defaults.tags.join(", ")} />
      </Field>

      <Field label="Visibility">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={status === "published" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus("published")}
          >
            Published
          </Button>
          <Button
            type="button"
            variant={status === "draft" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus("draft")}
          >
            Draft
          </Button>
        </div>
      </Field>

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
          {pending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
