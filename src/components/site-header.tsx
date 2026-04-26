import Link from "next/link";
import { Search, Upload, LogIn, LayoutDashboard, Settings, LogOut, User as UserIcon, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteLogo } from "@/components/site-logo";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentProfile } from "@/lib/profile";
import { signOut } from "@/app/(auth)/_actions";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fullProfile = user ? await getOrCreateCurrentProfile(supabase) : null;
  const profile = fullProfile
    ? {
        handle: fullProfile.handle,
        display_name: fullProfile.display_name,
        avatar_url: fullProfile.avatar_url,
        role: fullProfile.role,
      }
    : null;

  const isStaff = profile?.role === "moderator" || profile?.role === "admin";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container-page flex h-16 items-center gap-4">
        <SiteLogo />
        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/explore"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Explore
          </Link>
          <Link
            href="/explore?sort=trending"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Trending
          </Link>
          <Link
            href="/about"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            About
          </Link>
        </nav>

        <form action="/explore" className="ml-auto hidden flex-1 max-w-md md:block" role="search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              placeholder="Search assets, creators, tags..."
              aria-label="Search"
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle />
          {user ? (
            <>
              {profile ? (
                <Button asChild variant="default" size="sm" className="hidden sm:inline-flex">
                  <Link href="/upload">
                    <Upload className="mr-1.5 h-4 w-4" /> Upload
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="default" size="sm" className="hidden sm:inline-flex">
                  <Link href="/settings">Finish setup</Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                      <AvatarFallback>
                        {(profile?.display_name?.[0] ?? profile?.handle?.[0] ?? user.email?.[0] ?? "U").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    {profile ? (
                      <>
                        <div className="text-sm font-medium">{profile.display_name ?? profile.handle}</div>
                        <div className="text-xs font-normal text-muted-foreground">@{profile.handle}</div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-medium">{user.email ?? "Your account"}</div>
                        <div className="text-xs font-normal text-muted-foreground">Account setup pending</div>
                      </>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {profile ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href={`/u/${profile.handle}`}>
                          <UserIcon /> Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard">
                          <LayoutDashboard /> Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/upload">
                          <Upload /> Upload
                        </Link>
                      </DropdownMenuItem>
                    </>
                  ) : null}
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings /> Settings
                    </Link>
                  </DropdownMenuItem>
                  {isStaff ? (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <Shield /> Moderator
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <LogOut className="size-4" /> Sign out
                    </button>
                  </form>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">
                  <LogIn className="mr-1.5 h-4 w-4" /> Log in
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
