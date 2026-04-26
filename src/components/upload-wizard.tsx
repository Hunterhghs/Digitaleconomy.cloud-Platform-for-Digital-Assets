"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  Upload as UploadIcon,
  X,
  FileText,
  ImageIcon,
  Music,
  Video,
  Box,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
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
import { finalizeAsset, type UploadActionState } from "@/app/(app)/upload/_actions";
import { createClient } from "@/lib/supabase/client";
import { safeFileName, uploadResumable, type UploadProgress } from "@/lib/upload-client";

type Category = { id: string; name: string };

type Stage = "idle" | "uploading-original" | "uploading-preview" | "finalizing" | "done" | "error";

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
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const onDrop = useCallback(
    (accepted: File[]) => {
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
    },
    [title, previewUrl],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: MAX_UPLOAD_SIZE_BYTES,
    disabled: pending || stage !== "idle",
  });

  const isWorking = pending || stage === "uploading-original" || stage === "uploading-preview" || stage === "finalizing";
  const canSubmit = !!file && title.trim().length >= 2 && !isWorking;

  const cancel = () => {
    abortRef.current?.abort();
  };

  const reset = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setStage("idle");
    setProgress(null);
    setMessage(null);
    setErrors({});
  };

  const submit = () => {
    if (!file) return;
    setErrors({});
    setMessage(null);
    setStage("uploading-original");
    setProgress({ bytesUploaded: 0, bytesTotal: file.size, percent: 0 });

    const supabase = createClient();
    const controller = new AbortController();
    abortRef.current = controller;

    startTransition(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setStage("error");
        setMessage("Your session expired. Please sign in again.");
        return;
      }

      const userId = session.user.id;
      const id = crypto.randomUUID();
      const safeName = safeFileName(file.name);
      const filePath = `${userId}/${id}/${safeName}`;
      const contentType = file.type || "application/octet-stream";
      let thumbPath: string | null = null;

      try {
        await uploadResumable({
          file,
          bucket: "assets-original",
          objectPath: filePath,
          contentType,
          jwt: session.access_token,
          signal: controller.signal,
          onProgress: (p) => setProgress(p),
        });
      } catch (err) {
        const isAbort =
          (err as { name?: string } | null)?.name === "AbortError" ||
          (err instanceof DOMException && err.name === "AbortError");
        setStage("error");
        setMessage(
          isAbort
            ? "Upload cancelled."
            : `Upload failed: ${(err as Error)?.message ?? "Unknown error"}`,
        );
        return;
      }

      if (file.type.startsWith("image/")) {
        setStage("uploading-preview");
        const previewPath = `${userId}/${id}/preview-${safeName}`;
        const { error: prevErr } = await supabase.storage
          .from("assets-preview")
          .upload(previewPath, file, {
            cacheControl: "31536000",
            upsert: false,
            contentType,
          });
        if (!prevErr) thumbPath = previewPath;
      }

      setStage("finalizing");
      const fd = new FormData();
      fd.set("id", id);
      fd.set("file_path", filePath);
      fd.set("mime_type", contentType);
      fd.set("size_bytes", String(file.size));
      if (thumbPath) fd.set("thumbnail_path", thumbPath);
      fd.set("title", title);
      fd.set("description", description);
      fd.set("tags", tags);
      fd.set("license", license);
      if (categoryId) fd.set("category_id", categoryId);
      fd.set("status", status);

      const res: UploadActionState = await finalizeAsset(undefined, fd);
      if (res.ok && res.asset) {
        setStage("done");
        router.push(`/a/${res.asset.ownerHandle}/${res.asset.slug}`);
        return;
      }

      // Cleanup the uploaded files since the DB insert failed.
      try {
        await supabase.storage.from("assets-original").remove([filePath]);
        if (thumbPath) await supabase.storage.from("assets-preview").remove([thumbPath]);
      } catch {
        // best effort
      }
      setStage("error");
      if (res.fieldErrors) setErrors(res.fieldErrors);
      setMessage(res.message ?? "We couldn't save your asset. Please check the fields and try again.");
    });
  };

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  const stageLabel = (() => {
    switch (stage) {
      case "uploading-original":
        return progress
          ? `Uploading file… ${progress.percent}% (${formatBytes(progress.bytesUploaded)} of ${formatBytes(
              progress.bytesTotal,
            )})`
          : "Uploading file…";
      case "uploading-preview":
        return "Uploading preview…";
      case "finalizing":
        return "Saving asset…";
      case "done":
        return "Published! Taking you to your asset…";
      default:
        return null;
    }
  })();

  return (
    <div className="grid gap-6 md:grid-cols-[1fr,360px]">
      <div className="grid gap-4">
        <div
          {...getRootProps()}
          className={`relative flex aspect-video w-full ${
            isWorking ? "cursor-default" : "cursor-pointer"
          } flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 p-8 text-center transition-colors ${
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
          {file && !isWorking ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
              className="absolute right-3 top-3 rounded-full bg-background/80 p-1 text-muted-foreground backdrop-blur hover:text-foreground"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {stage === "uploading-original" && progress ? (
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-[width] duration-150"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {stageLabel}
              </span>
              <button
                type="button"
                onClick={cancel}
                className="font-medium text-foreground hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {stage === "uploading-preview" || stage === "finalizing" ? (
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {stageLabel}
          </div>
        ) : null}

        {stage === "done" ? (
          <div className="inline-flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> {stageLabel}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4">
        <Field label="Title" error={errors.title}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
            disabled={isWorking}
          />
        </Field>

        <Field label="Description" error={errors.description}>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={4_000}
            placeholder="What is this asset, and how should people use it?"
            disabled={isWorking}
          />
        </Field>

        <Field label="Category" error={errors.category_id}>
          <Select value={categoryId} onValueChange={setCategoryId} disabled={isWorking}>
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
          <Select value={license} onValueChange={setLicense} disabled={isWorking}>
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
            disabled={isWorking}
          />
        </Field>

        <Field label="Visibility">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={status === "published" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatus("published")}
              disabled={isWorking}
            >
              Publish now
            </Button>
            <Button
              type="button"
              variant={status === "draft" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatus("draft")}
              disabled={isWorking}
            >
              Save as draft
            </Button>
          </div>
        </Field>

        {message ? (
          <p
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
              stage === "error"
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-muted-foreground/20 bg-muted/40 text-foreground"
            }`}
          >
            {stage === "error" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : null}
            <span>{message}</span>
          </p>
        ) : null}

        <Button onClick={submit} disabled={!canSubmit} className="w-full">
          {isWorking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Working…
            </>
          ) : status === "draft" ? (
            "Save draft"
          ) : (
            "Publish asset"
          )}
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
