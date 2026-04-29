export const siteConfig = {
  name: "DigitalEconomy.cloud",
  shortName: "DigitalEconomy",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  description:
    "A nonprofit commons for creating, owning, and freely sharing digital assets. Free to list, free to download.",
  tagline: "Create. Own. Share. Always free.",
  ogImage: "/opengraph-image.png",
  keywords: [
    "digital assets",
    "creative commons",
    "open source assets",
    "free downloads",
    "creator platform",
    "nonprofit",
  ],
} as const;

export const ASSET_LICENSES = [
  {
    id: "CC0",
    name: "CC0 1.0 (Public Domain)",
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
    short: "Public domain",
  },
  {
    id: "CC-BY",
    name: "CC BY 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
    short: "Attribution required",
  },
  {
    id: "CC-BY-SA",
    name: "CC BY-SA 4.0",
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
    short: "Share-alike",
  },
  {
    id: "CC-BY-NC",
    name: "CC BY-NC 4.0",
    url: "https://creativecommons.org/licenses/by-nc/4.0/",
    short: "Non-commercial",
  },
  {
    id: "ARR",
    name: "All Rights Reserved",
    url: null,
    short: "Free to download, no reuse rights",
  },
] as const;

export type AssetLicenseId = (typeof ASSET_LICENSES)[number]["id"];

export const MAX_UPLOAD_SIZE_MB = 100;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export const ALLOWED_MIME_PREFIXES = [
  "image/",
  "audio/",
  "video/",
  "application/pdf",
  /** Word / Excel / PowerPoint (modern XML packages) */
  "application/vnd.openxmlformats-officedocument",
  /** Older Office binaries */
  "application/vnd.ms-",
  "application/msword",
  /** LibreOffice / ODF */
  "application/vnd.oasis.opendocument",
  /** Other common uploads */
  "application/rtf",
  "application/epub+zip",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/json",
  "application/xml",
  "text/",
  "model/",
  "font/",
] as const;

/** When MIME is empty or unreliable (mobile Safari), allow known-safe extensions only */
const ALLOWED_EXTENSIONS = new Set([
  // images
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "svg",
  "bmp",
  "ico",
  "tif",
  "tiff",
  "heic",
  "avif",
  // video
  "mp4",
  "webm",
  "mov",
  "mkv",
  "avi",
  "m4v",
  // audio
  "mp3",
  "wav",
  "ogg",
  "flac",
  "m4a",
  "aac",
  // documents
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "odt",
  "ods",
  "odp",
  "rtf",
  "epub",
  "txt",
  "csv",
  "md",
  // archives / data / code-ish
  "zip",
  "rar",
  "7z",
  "gz",
  "tar",
  "json",
  "xml",
  "yaml",
  "yml",
  // 3d / fonts
  "glb",
  "gltf",
  "obj",
  "stl",
  "fbx",
  "ttf",
  "otf",
  "woff",
  "woff2",
]);

function extensionFromFileName(fileName: string | undefined): string | null {
  if (!fileName) return null;
  const base = fileName.split(/[/\\]/).pop() ?? fileName;
  const dot = base.lastIndexOf(".");
  if (dot < 0 || dot === base.length - 1) return null;
  return base.slice(dot + 1).toLowerCase();
}

/**
 * Validate upload MIME type. Pass `fileName` when available so empty MIME from
 * mobile pickers or `application/octet-stream` still maps to allowed extensions.
 */
export function isAllowedMime(mime: string, fileName?: string) {
  const m = mime.trim().toLowerCase();
  const ext = extensionFromFileName(fileName);

  // Refuse naive octet-stream matches — rely on extension allowlist instead.
  if (m && m !== "application/octet-stream") {
    if (ALLOWED_MIME_PREFIXES.some((p) => m.startsWith(p))) return true;
  }

  if (ext && ALLOWED_EXTENSIONS.has(ext)) return true;

  return false;
}
