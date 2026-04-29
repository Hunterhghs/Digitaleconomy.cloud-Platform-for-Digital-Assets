import Link from "next/link";
import { SiteLogo } from "@/components/site-logo";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-muted/30">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <SiteLogo />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            A nonprofit commons for digital assets. Free to list. Free to download. Always.
          </p>
        </div>
        <FooterColumn
          title="Discover"
          links={[
            { href: "/explore", label: "Explore" },
            { href: "/explore?sort=trending", label: "Trending" },
            { href: "/explore?sort=new", label: "New uploads" },
          ]}
        />
        <FooterColumn
          title="Community"
          links={[
            { href: "/about", label: "About" },
            { href: "/upload", label: "Upload an asset" },
            { href: "/dashboard", label: "Your dashboard" },
          ]}
        />
      </div>
      <div className="border-t">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-4 text-xs text-muted-foreground md:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.name}. Operated as a nonprofit project.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/dmca" className="hover:text-foreground">DMCA</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
