/**
 * Normalize MIME types using the filename — critical on mobile Safari where
 * `File.type` can be empty, generic octet-stream, or occasionally wrong.
 */

function basenameLeaf(pathOrName: string): string {
  return pathOrName.split(/[/\\]/).pop() ?? pathOrName;
}

export function extensionFromPath(pathOrName: string): string | null {
  const base = basenameLeaf(pathOrName);
  const dot = base.lastIndexOf(".");
  if (dot < 0 || dot === base.length - 1) return null;
  return base.slice(dot + 1).toLowerCase();
}

/** Canonical MIME types by lowercase extension */
export const MIME_BY_EXTENSION: Record<string, string> = {
  // images
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",
  tif: "image/tiff",
  tiff: "image/tiff",
  heic: "image/heic",
  avif: "image/avif",
  // video
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  m4v: "video/x-m4v",
  // audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
  m4a: "audio/mp4",
  aac: "audio/aac",
  // documents — PDF / Office / text data
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  rtf: "application/rtf",
  epub: "application/epub+zip",
  txt: "text/plain",
  csv: "text/csv",
  md: "text/markdown",
  json: "application/json",
  xml: "application/xml",
  yaml: "application/yaml",
  yml: "application/yaml",
  // archives
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  gz: "application/gzip",
  tar: "application/x-tar",
  // 3d / fonts
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  obj: "model/obj",
  stl: "model/stl",
  fbx: "application/octet-stream",
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
};

/**
 * Returns a corrected MIME string suitable for storing on `assets.mime_type`.
 */
export function normalizeMimeType(declaredMime: string, pathOrFileName: string): string {
  const ext = extensionFromPath(pathOrFileName);
  const extMime = ext ? MIME_BY_EXTENSION[ext] : undefined;
  const d = declaredMime.trim().toLowerCase();

  if (!d || d === "application/octet-stream") {
    return extMime ?? (d || "application/octet-stream");
  }

  // Wrong image/* reported for known document/video extensions (mobile quirks)
  if (d.startsWith("image/") && extMime && !extMime.startsWith("image/")) {
    return extMime;
  }

  return declaredMime.trim();
}

/** Prefer extension-based MIME when DB/browser metadata disagrees with `file_path`. */
export function effectiveMimeFromAsset(
  mime_type: string | null | undefined,
  file_path: string | null | undefined,
): string {
  return normalizeMimeType(mime_type ?? "", file_path ?? "");
}
