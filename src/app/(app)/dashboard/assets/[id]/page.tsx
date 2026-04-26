import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getCategories, getCurrentProfile } from "@/lib/queries";
import { EditAssetForm } from "./edit-form";

export const metadata = { title: "Edit asset" };

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=/dashboard/assets/${id}`);

  const supabase = await createClient();
  const { data: asset } = await supabase
    .from("assets")
    .select("id, owner_id, title, description, license, status, category_id")
    .eq("id", id)
    .maybeSingle();
  if (!asset || asset.owner_id !== profile.id) notFound();

  const { data: tagLinks } = await supabase
    .from("asset_tags")
    .select("tag:tags(name)")
    .eq("asset_id", id);
  const tags = (tagLinks ?? [])
    .map((t) => (Array.isArray(t.tag) ? t.tag[0] : t.tag))
    .filter(Boolean)
    .map((t: { name: string }) => t.name);

  const categories = await getCategories();

  return (
    <div className="container-page max-w-3xl py-10">
      <Link
        href="/dashboard"
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Dashboard
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Edit asset</CardTitle>
        </CardHeader>
        <CardContent>
          <EditAssetForm
            defaults={{
              id: asset.id,
              title: asset.title,
              description: asset.description,
              license: asset.license,
              category_id: asset.category_id,
              status: asset.status === "removed" ? "draft" : asset.status,
              tags,
            }}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
