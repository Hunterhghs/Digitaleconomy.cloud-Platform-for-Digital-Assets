import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { AvatarUploader } from "./avatar-uploader";
import { getCurrentProfile } from "@/lib/queries";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/settings");

  type Links = { website?: string };
  const links = (profile.links as Links | null) ?? {};

  return (
    <div className="container-page max-w-3xl py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage how you appear across DigitalEconomy.cloud.</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
          <CardDescription>PNG or JPG, square, up to 2 MB.</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUploader
            initialUrl={profile.avatar_url ?? null}
            fallback={(profile.display_name?.[0] ?? profile.handle[0]) || "U"}
          />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Public profile</CardTitle>
          <CardDescription>
            Visible at <Link className="font-medium hover:underline" href={`/u/${profile.handle}`}>/u/{profile.handle}</Link>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaults={{
              handle: profile.handle,
              display_name: profile.display_name ?? null,
              bio: profile.bio ?? null,
              website: links.website ?? null,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
