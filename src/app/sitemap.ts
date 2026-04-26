import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");
  const staticUrls: MetadataRoute.Sitemap = [
    "",
    "/explore",
    "/about",
    "/terms",
    "/privacy",
    "/dmca",
    "/login",
    "/signup",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.6,
  }));

  let assetUrls: MetadataRoute.Sitemap = [];
  let profileUrls: MetadataRoute.Sitemap = [];
  let categoryUrls: MetadataRoute.Sitemap = [];

  try {
    const supabase = await createClient();
    const [{ data: assets }, { data: profiles }, { data: categories }] = await Promise.all([
      supabase
        .from("assets")
        .select("slug, updated_at, owner:profiles!assets_owner_id_fkey(handle)")
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(1000),
      supabase.from("profiles").select("handle, updated_at").order("updated_at", { ascending: false }).limit(1000),
      supabase.from("categories").select("slug"),
    ]);

    assetUrls = (assets ?? [])
      .map((a) => {
        const owner = Array.isArray(a.owner) ? a.owner[0] : a.owner;
        if (!owner) return null;
        return {
          url: `${base}/a/${owner.handle}/${a.slug}`,
          lastModified: a.updated_at ? new Date(a.updated_at) : undefined,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        };
      })
      .filter(Boolean) as MetadataRoute.Sitemap;

    profileUrls = (profiles ?? []).map((p) => ({
      url: `${base}/u/${p.handle}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));

    categoryUrls = (categories ?? []).map((c) => ({
      url: `${base}/c/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
  } catch {
    // Supabase isn't reachable at build time — return static-only sitemap.
  }

  return [...staticUrls, ...categoryUrls, ...profileUrls, ...assetUrls];
}
