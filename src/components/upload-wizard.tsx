"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Upload as UploadIcon, X, FileText, ImageIcon, Music, Video, Box } from "lucide-react";
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
import { ASSET_LICENSES, MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB, isAllowedMime } from "@/lib/site";
import { formatBytes, isAudioMime, isImageMime, isVideoMime } from "@/lib/utils";
import { uploadAndCreateAsset, type UploadActionState } from "@/app/(app)/upload/_actions";

type Category = { id: string; name: string };

export function UploadWizard({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [license, setLicense] = useState<string>("CC-BY");
  const [categoryId, setCategoryId] = useState<string>("");
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    if (f.size > MAX_UPLOAD_SIZE_BYTES) {
      setMessage(`Files must be ${MAX_UPLOAD_SIZE_MB} MB or smaller.`);
      return;
    }
    if (!isAllowedMime(f.type)) {
      setMessage(`Type "${f.type || "unknown"}" isn't currently allowed.`);
      return;
    }
    setMessage(null);
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[a-z0-9]+$/i, ""));
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  }, [title, previewUrl]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: MAX_UPLOAD_SIZE_BYTES,
  });

  const canSubmit = !!file && title.trim().length >= 2 && !pending;

  const submit = () => {
    if (!file) return;
    setErrors({});
    setMessage(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("title", title);
    fd.set("description", description);
    fd.set("tags", tags);
    fd.set("license", license);
    if (categoryId) fd.set("category_id", categoryId);
    fd.set("status", status);
    startTransition(async () => {
      const res: UploadActionState = await uploadAndCreateAsset(undefined, fd);
      if (res.ok && res.asset) {
        router.push(`/a/${res.asset.ownerHandle}/${res.asset.slug}`);
        return;
      }
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.message) setMessage(res.message);
    });
  };

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  return (
    <div className="grid gap-6 md:grid-cols-[1fr,360px]">
      <div className="grid gap-4">
        <div
          {...getRootProps()}
          className={`relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 p-8 text-center transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "hover:border-primary/60"
          }`}
        >
          <input {...getInputProps()} />
          {file ? (
            previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="max-h-full max-w-full rounded object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <FilePreviewIcon mime={file.type} />
                <div className="text-sm font-medium">{file.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatBytes(file.size)} · {file.type || "unknown"}
                </div>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-2">
              <UploadIcon className="h-10 w-10 text-muted-foreground" />
              <div className="text-sm font-medium">
                {isDragActive ? "Drop the file here" : "Drag & drop or click to choose a file"}
              </div>
              <div className="text-xs text-muted-foreground">
                Up to {MAX_UPLOAD_SIZE_MB} MB. Images, audio, video, PDFs, fonts, code, archives, and more.
              </div>
            </div>
          )}
          {file ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }}
              className="absolute right-3 top-3 rounded-full bg-background/80 p-1 text-muted-foreground backdrop-blur hover:text-foreground"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4">
        <Field label="Title" error={errors.title}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
        </Field>

        <Field label="Description" error={errors.description}>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={4_000}
            placeholder="What is this asset, and how should people use it?"
          />
        </Field>

        <Field label="Category" error={errors.category_id}>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a category" />
            </SelectTrigger>
            <SelectContent>
              {sortedCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="License" error={errors.license}>
          <Select value={license} onValueChange={setLicense}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSET_LICENSES.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{l.name}</span>
                    <span className="text-xs text-muted-foreground">{l.short}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Tags" hint="Comma-separated, up to 15." error={errors.tags}>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="watercolor, abstract, blue"
          />
        </Field>

        <Field label="Visibility">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={status === "published" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatus("published")}
            >
              Publish now
            </Button>
            <Button
              type="button"
              variant={status === "draft" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatus("draft")}
            >
              Save as draft
            </Button>
          </div>
        </Field>

        {message ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
          </p>
        ) : null}

        <Button onClick={submit} disabled={!canSubmit} className="w-full">
          {pending ? "Uploading..." : status === "draft" ? "Save draft" : "Publish asset"}
        </Button>
        <p className="text-xs text-muted-foreground">
          By publishing you confirm you have the right to share this file under the chosen license.
        </p>
      </div>
    </div>
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

function FilePreviewIcon({ mime }: { mime: string }) {
  const cls = "h-12 w-12 text-muted-foreground";
  if (isImageMime(mime)) return <ImageIcon className={cls} />;
  if (isAudioMime(mime)) return <Music className={cls} />;
  if (isVideoMime(mime)) return <Video className={cls} />;
  if (mime?.startsWith("model/")) return <Box className={cls} />;
  return <FileText className={cls} />;
}
