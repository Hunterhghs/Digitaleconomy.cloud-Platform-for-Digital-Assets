export const siteConfig = {
  name: "DigitalEconomy.cloud",
  shortName: "DigitalEconomy",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  description:
    "A nonprofit commons for creating, owning, and freely sharing digital assets. Free to list, free to download.",
  tagline: "Create. Own. Share. Always free.",
  links: {
    github: "https://github.com/your-org/digitaleconomy.cloud",
    twitter: "https://twitter.com/digitaleconomy",
  },
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
  "application/zip",
  "application/x-zip-compressed",
  "application/json",
  "application/octet-stream",
  "text/",
  "model/",
  "font/",
] as const;

export function isAllowedMime(mime: string) {
  if (!mime) return false;
  return ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p));
}
