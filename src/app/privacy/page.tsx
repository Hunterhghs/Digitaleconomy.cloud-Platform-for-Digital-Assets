import { siteConfig } from "@/lib/site";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <article className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-US")}</p>
      <section className="prose prose-neutral dark:prose-invert mt-6 max-w-none">
        <h2>What we collect</h2>
        <ul>
          <li>Account info: email and (optionally) display name and avatar.</li>
          <li>Content you upload, including metadata you choose to attach.</li>
          <li>Basic usage: page views, downloads, and likes (used to power feeds and counters).</li>
          <li>Standard server logs (IP, user agent), kept short-term for abuse prevention.</li>
        </ul>
        <h2>What we don&apos;t do</h2>
        <ul>
          <li>We don&apos;t sell your data.</li>
          <li>We don&apos;t use behavioral advertising.</li>
          <li>We don&apos;t share your email with creators or visitors.</li>
        </ul>
        <h2>Where data lives</h2>
        <p>Data is stored with our hosting provider (Vercel) and database/storage provider (Supabase).</p>
        <h2>Your rights</h2>
        <p>
          You can edit your profile, delete individual assets, or delete your account from
          settings. Email <a href={`mailto:privacy@digitaleconomy.cloud`}>privacy@digitaleconomy.cloud</a>{" "}
          for any access, correction, or deletion request.
        </p>
        <h2>Cookies</h2>
        <p>
          We use a session cookie to keep you signed in. We do not set tracking or advertising cookies.
        </p>
        <p className="text-sm text-muted-foreground">
          {siteConfig.name} is a nonprofit project. This policy is provided in good faith and is
          not legal advice; the project will work with counsel as it scales.
        </p>
      </section>
    </article>
  );
}
