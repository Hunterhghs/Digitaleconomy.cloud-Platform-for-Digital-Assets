import { Heart, ShieldCheck, Globe, Sparkles } from "lucide-react";
import { siteConfig } from "@/lib/site";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <article className="container-page max-w-3xl py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">About</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">A commons for digital assets</h1>
        <p className="mt-3 text-base text-muted-foreground">{siteConfig.description}</p>
      </header>

      <section className="prose prose-neutral dark:prose-invert max-w-none">
        <h2>Mission</h2>
        <p>
          {siteConfig.name} exists so creators can share digital assets without paywalls, and so
          anyone can find and use those assets without friction. We are operated as a nonprofit
          project. There are no plans to charge for listing, downloading, or browsing.
        </p>

        <h2>How it works</h2>
        <ul>
          <li>Anyone can create an account in seconds.</li>
          <li>Upload digital assets — images, audio, video, fonts, code, datasets, documents, 3D models, and more.</li>
          <li>Pick a license at upload time. You keep ownership; the world gets to find your work.</li>
          <li>Reports go to a community moderation queue; harmful content is removed.</li>
        </ul>

        <h2>Sustaining the commons</h2>
        <p>
          Hosting and storage cost something. As we grow we&apos;ll publish costs transparently and
          accept optional donations to keep the lights on. Donations never unlock features.
        </p>
      </section>

      <section className="mt-10 grid gap-3 sm:grid-cols-2">
        <Pillar
          icon={<Heart className="h-5 w-5 text-primary" />}
          title="Free forever"
          body="No subscriptions, no paywalls, no upsells."
        />
        <Pillar
          icon={<ShieldCheck className="h-5 w-5 text-primary" />}
          title="Creator-owned"
          body="You pick the license. Attribution is built in."
        />
        <Pillar
          icon={<Globe className="h-5 w-5 text-primary" />}
          title="Open by default"
          body="Code, operations, and moderation policies are public."
        />
        <Pillar
          icon={<Sparkles className="h-5 w-5 text-primary" />}
          title="Community first"
          body="Built with and for the people who upload here."
        />
      </section>
    </article>
  );
}

function Pillar({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div>{icon}</div>
      <h3 className="mt-2 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
