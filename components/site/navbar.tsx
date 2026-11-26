import { NAV_ITEMS } from "@/lib/nav";
import { AuthButton } from "@/components/site/auth-button";
import { MobileNav } from "@/components/site/mobile-nav";
import { NavLink } from "@/components/site/nav-link";
import { SearchTrigger } from "@/components/site/search-trigger";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Wordmark } from "@/components/site/wordmark";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      {/* The wordmark is the only flexible item in the row. It carries the
          current path, which is as long as the slug, so it gets the leftover
          width and truncates; the nav and the icons keep theirs. The links sit
          on the right so they do not slide as the path changes length. */}
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-6">
        <Wordmark />
        <nav
          aria-label="Main"
          className="hidden shrink-0 items-center gap-6 md:flex"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1">
          <SearchTrigger />
          <div className="hidden items-center gap-1 md:flex">
            <ThemeToggle />
            <AuthButton />
          </div>
          <MobileNav items={NAV_ITEMS} />
        </div>
      </div>
    </header>
  );
}
