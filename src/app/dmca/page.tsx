import { siteConfig } from "@/lib/site";

export const metadata = { title: "DMCA & Takedowns" };

export default function DmcaPage() {
  return (
    <article className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-semibold tracking-tight">DMCA & takedowns</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-US")}</p>
      <section className="prose prose-neutral dark:prose-invert mt-6 max-w-none">
        <p>
          {siteConfig.name} respects intellectual property rights. If you believe content here
          infringes your copyright, please send a notice that includes:
        </p>
        <ol>
          <li>Identification of the copyrighted work.</li>
          <li>Identification of the infringing material (URL on this site).</li>
          <li>Your contact information (name, email, address, phone).</li>
          <li>
            A statement, under penalty of perjury, that you have a good-faith belief that the use
            is not authorized, and that the information in the notice is accurate, and that you are
            the copyright owner or authorized to act on the owner&apos;s behalf.
          </li>
          <li>Your physical or electronic signature.</li>
        </ol>
        <p>
          Send notices to{" "}
          <a href="mailto:dmca@digitaleconomy.cloud">dmca@digitaleconomy.cloud</a>. We&apos;ll
          process valid notices promptly. Counter-notices follow the same channel.
        </p>
        <p>
          You can also use the <strong>Report</strong> button on any asset page; reports are routed
          to the moderation team.
        </p>
      </section>
    </article>
  );
}
