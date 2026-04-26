"use client";

import * as tus from "tus-js-client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export type UploadProgress = {
  bytesUploaded: number;
  bytesTotal: number;
  percent: number;
};

export type UploadOptions = {
  file: File | Blob;
  bucket: string;
  objectPath: string;
  contentType: string;
  jwt: string;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
  upsert?: boolean;
  cacheControl?: string;
};

/**
 * Upload a file directly from the browser to Supabase Storage using the TUS
 * resumable protocol. This bypasses Vercel's Server Action body limit and
 * gives us real-time progress + resumability for large files.
 *
 * Reference: https://supabase.com/docs/guides/storage/uploads/resumable-uploads
 */
export function uploadResumable(options: UploadOptions): Promise<void> {
  const {
    file,
    bucket,
    objectPath,
    contentType,
    jwt,
    onProgress,
    signal,
    upsert = false,
    cacheControl = "3600",
  } = options;

  if (!SUPABASE_URL) {
    return Promise.reject(new Error("Storage is not configured."));
  }

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 1500, 3000, 6000, 12000],
      headers: {
        authorization: `Bearer ${jwt}`,
        "x-upsert": upsert ? "true" : "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: objectPath,
        contentType,
        cacheControl,
      },
      // Supabase requires 6 MB chunks for resumable uploads.
      chunkSize: 6 * 1024 * 1024,
      onError: (error) => reject(error),
      onProgress: (bytesUploaded, bytesTotal) => {
        if (onProgress) {
          onProgress({
            bytesUploaded,
            bytesTotal,
            percent: bytesTotal > 0 ? Math.round((bytesUploaded / bytesTotal) * 100) : 0,
          });
        }
      },
      onSuccess: () => resolve(),
    });

    if (signal) {
      if (signal.aborted) {
        upload.abort();
        reject(new DOMException("Upload aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", () => {
        upload.abort();
        reject(new DOMException("Upload aborted", "AbortError"));
      });
    }

    upload.findPreviousUploads().then(
      (previousUploads) => {
        if (previousUploads.length > 0) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      },
      () => upload.start(),
    );
  });
}

export function safeFileName(name: string): string {
  const cleaned = name.replace(/[^a-z0-9._-]+/gi, "_").slice(-128);
  return cleaned || "file";
}
