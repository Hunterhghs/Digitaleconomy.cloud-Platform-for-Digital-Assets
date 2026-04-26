import { siteConfig } from "@/lib/site";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <article className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-US")}</p>
      <section className="prose prose-neutral dark:prose-invert mt-6 max-w-none">
        <p>
          These Terms govern your use of {siteConfig.name}. By creating an account or using the
          service, you agree to these Terms.
        </p>
        <h2>1. Eligibility</h2>
        <p>You must be at least 13 years old (or the age of digital consent in your country).</p>
        <h2>2. Your content</h2>
        <p>
          You retain ownership of everything you upload. By publishing an asset, you license it to
          downloaders under the license you select at upload time, and you grant {siteConfig.name}
          a non-exclusive, royalty-free license to host, display, and distribute the asset for the
          purpose of operating the service.
        </p>
        <h2>3. Acceptable use</h2>
        <p>
          You may not upload content that infringes intellectual property rights, contains malware,
          is illegal in your jurisdiction or in the United States, depicts minors in a sexual
          context, harasses people, or doxxes them. Reports may be filed against any asset; staff
          may remove content that violates these rules.
        </p>
        <h2>4. Free service</h2>
        <p>
          {siteConfig.name} is provided free of charge as a nonprofit project. There are no plans
          to charge for listing or downloading.
        </p>
        <h2>5. Disclaimer & liability</h2>
        <p>
          The service is provided &quot;as is&quot; without warranty of any kind. To the maximum extent
          permitted by law, {siteConfig.name} is not liable for any damages arising from your use
          of the service.
        </p>
        <h2>6. Termination</h2>
        <p>
          You may delete your account at any time from settings. We may suspend accounts that
          violate these Terms or applicable law.
        </p>
        <h2>7. Changes</h2>
        <p>
          We may update these Terms. Material changes will be communicated by email or prominent
          notice on the site.
        </p>
      </section>
    </article>
  );
}
