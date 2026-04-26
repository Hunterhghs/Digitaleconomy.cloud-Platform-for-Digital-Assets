import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { AvatarUploader } from "./avatar-uploader";
import { getCurrentProfile, getCurrentUser } from "@/lib/queries";
import { isWeb3Enabled } from "@/lib/web3/chains";
import { Wallet } from "lucide-react";

export const metadata = { title: "Settings" };

function deriveBaseHandleFromEmail(email: string | null | undefined): string {
  if (!email) return "";
  const local = email.split("@")[0] ?? "";
  return local
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]+/g, "")
    .slice(0, 24);
}

export default async function SettingsPage() {
  const [profile, user] = await Promise.all([getCurrentProfile(), getCurrentUser()]);
  if (!user) redirect("/login?next=/settings");

  type Links = { website?: string };
  const links = (profile?.links as Links | null) ?? {};
  const isFirstTimeSetup = !profile;

  // If the auto-creator couldn't make a profile, give the user a sensible
  // default handle they can edit, derived from their email.
  const defaultHandle = profile?.handle ?? deriveBaseHandleFromEmail(user.email);

  return (
    <div className="container-page max-w-3xl py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage how you appear across DigitalEconomy.cloud.
        </p>
      </div>

      {isFirstTimeSetup ? (
        <div
          role="status"
          className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <strong className="font-semibold">Welcome — let&rsquo;s finish setting up your account.</strong>
          <span className="ml-1">
            Pick a handle below and save to unlock uploads, your dashboard, and your public profile.
          </span>
        </div>
      ) : null}

      {profile ? (
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
      ) : null}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{isFirstTimeSetup ? "Choose your handle" : "Public profile"}</CardTitle>
          <CardDescription>
            {profile ? (
              <>
                Visible at{" "}
                <Link className="font-medium hover:underline" href={`/u/${profile.handle}`}>
                  /u/{profile.handle}
                </Link>
                .
              </>
            ) : (
              <>This is the URL where people will find your work.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaults={{
              handle: defaultHandle,
              display_name: profile?.display_name ?? null,
              bio: profile?.bio ?? null,
              website: links.website ?? null,
            }}
          />
        </CardContent>
      </Card>

      {isWeb3Enabled() && profile ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-4" aria-hidden /> Wallets
            </CardTitle>
            <CardDescription>
              Link an Ethereum wallet to mint your assets as NFTs and prove on-chain ownership.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/settings/wallet"
              className="inline-flex items-center text-sm font-medium underline-offset-4 hover:underline"
            >
              Manage linked wallets &rarr;
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
