import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`;
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US", {
    notation: n >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(n);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function shortId(length = 6) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined") crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export function absoluteUrl(path = "/") {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return new URL(path, base).toString();
}

export function isImageMime(mime: string | null | undefined) {
  return !!mime && mime.startsWith("image/");
}
export function isVideoMime(mime: string | null | undefined) {
  return !!mime && mime.startsWith("video/");
}
export function isAudioMime(mime: string | null | undefined) {
  return !!mime && mime.startsWith("audio/");
}
export function isPdfMime(mime: string | null | undefined) {
  const m = mime?.trim().toLowerCase() ?? "";
  return m === "application/pdf" || m === "application/x-pdf";
}

/** Short hint when we cannot embed inline preview (Office, archives, fonts, etc.). */
export function assetPreviewFallbackHint(mime: string): string | null {
  const m = mime.trim().toLowerCase();
  if (!m) return null;
  if (
    m.startsWith("application/vnd.openxmlformats") ||
    m.startsWith("application/vnd.ms-") ||
    m === "application/msword"
  ) {
    return "Download to open in Microsoft Office, LibreOffice, or compatible apps.";
  }
  if (m.startsWith("application/vnd.oasis.opendocument")) {
    return "Download to open in LibreOffice or compatible apps.";
  }
  if (
    m.startsWith("text/") ||
    m === "application/json" ||
    m === "application/xml" ||
    m === "application/yaml"
  ) {
    return "Download to view or edit in a text editor or IDE.";
  }
  if (m.startsWith("font/")) {
    return "Download to install or use in design tools.";
  }
  if (m.startsWith("model/")) {
    return "Download for 3D viewers or authoring tools.";
  }
  if (
    m === "application/zip" ||
    m.includes("rar") ||
    m.includes("compressed") ||
    m.includes("gzip") ||
    m === "application/x-tar"
  ) {
    return "Download and extract with your archive utility.";
  }
  if (m === "application/epub+zip") {
    return "Download to open in an e‑reader app.";
  }
  if (m === "application/rtf") {
    return "Download to open in Word or any rich‑text editor.";
  }
  return null;
}
