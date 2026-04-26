import { redirect } from "next/navigation";
import { UploadWizard } from "@/components/upload-wizard";
import { getCategories, getCurrentProfile, getCurrentUser } from "@/lib/queries";

export const metadata = { title: "Upload an asset" };

export default async function UploadPage() {
  const [profile, categories] = await Promise.all([getCurrentProfile(), getCategories()]);
  if (!profile) {
    const user = await getCurrentUser();
    if (!user) redirect("/login?next=/upload");
    redirect(
      "/settings?notice=" + encodeURIComponent("Choose a handle before uploading your first asset."),
    );
  }

  return (
    <div className="container-page max-w-5xl py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Upload an asset</h1>
        <p className="text-sm text-muted-foreground">
          Share something you made. Free to list, free to download.
        </p>
      </header>
      <UploadWizard categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
