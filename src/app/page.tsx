import Link from "next/link";
import { ArrowRight, Sparkles, Globe, ShieldCheck, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssetGrid } from "@/components/asset-grid";
import { getCategories, listAssets } from "@/lib/queries";
import { siteConfig } from "@/lib/site";

export const revalidate = 60;

export default async function HomePage() {
  const [trending, fresh, categories] = await Promise.all([
    listAssets({ sort: "trending", limit: 8 }),
    listAssets({ sort: "new", limit: 8 }),
    getCategories(),
  ]);

  return (
    <>
      <Hero />

      <section className="container-page py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold">Browse by category</h2>
            <p className="text-sm text-muted-foreground">Find exactly what you need.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/c/${c.slug}`}
              className="group flex aspect-square flex-col items-center justify-center rounded-lg border bg-card text-center transition-colors hover:border-primary/40 hover:bg-accent"
            >
              <div className="text-sm font-medium">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold">Trending now</h2>
            <p className="text-sm text-muted-foreground">What the community is loving this week.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/explore?sort=trending">
              See more <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <AssetGrid
          assets={trending}
          empty="No assets yet — be the first to upload something amazing!"
        />
      </section>

      <section className="container-page py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold">Fresh uploads</h2>
            <p className="text-sm text-muted-foreground">Just shared by creators.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/explore?sort=new">
              See more <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <AssetGrid assets={fresh} empty="The first uploads will land here." />
      </section>

      <Values />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(99,102,241,0.18),transparent_70%)]"
      />
      <div className="container-page relative py-16 text-center md:py-24">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <Sparkles className="h-3 w-3 text-primary" /> Nonprofit · free forever
        </div>
        <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
          {siteConfig.tagline}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          {siteConfig.description}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Create your account</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/explore">Browse assets</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Values() {
  const values = [
    {
      icon: Heart,
      title: "Always free",
      body: "No paywalls. No subscriptions. Listing and downloading is free, forever.",
    },
    {
      icon: ShieldCheck,
      title: "You keep ownership",
      body: "You pick the license at upload time. Your work is credited to you.",
    },
    {
      icon: Globe,
      title: "Operated as a commons",
      body: "Open source, transparent operations, community moderation.",
    },
  ];
  return (
    <section className="border-t bg-muted/30">
      <div className="container-page grid gap-6 py-14 md:grid-cols-3">
        {values.map((v) => (
          <div key={v.title} className="rounded-lg border bg-card p-6">
            <v.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-semibold">{v.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{v.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
