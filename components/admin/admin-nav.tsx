"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ADMIN_NAV } from "@/components/admin/nav-items";

/**
 * Overview ("/admin") is a prefix of every admin route, so it must match
 * exactly; deeper sections match themselves and their children.
 */
function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The admin nav link list for the desktop sidebar. The mobile overlay renders
 * its own larger links from the same ADMIN_NAV source.
 */
export function AdminNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors duration-150",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
          </Link>
        );
      })}
    </>
  );
}

/**
 * Full-screen overlay that replaces the sidebar below `sm`, matching the
 * public site's mobile nav.
 */
export function AdminMobileNav() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open admin menu">
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="top" className="h-dvh w-full max-w-full">
        <SheetHeader>
          <SheetTitle className="text-left font-mono text-sm font-medium">
            glyn<span className="text-brand">.dev</span>
            <span className="ml-2 text-xs text-muted-foreground">admin</span>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-1 flex-col gap-6 px-6 pt-4">
          {ADMIN_NAV.map(({ href, label }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-2xl font-medium tracking-tight transition-colors duration-150",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <Separator />
        <div className="flex items-center px-6 pb-6">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            <ExternalLink className="size-4" /> View site
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
