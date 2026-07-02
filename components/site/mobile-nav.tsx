"use client";

import * as React from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AuthButton } from "@/components/site/auth-button";
import { NavLink } from "@/components/site/nav-link";
import { SignInDialog } from "@/components/site/sign-in-dialog";
import { ThemeToggle } from "@/components/site/theme-toggle";
import type { NavItem } from "@/lib/nav";

export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = React.useState(false);
  const [signInOpen, setSignInOpen] = React.useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            className="md:hidden"
          >
            <Menu className="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="top" className="h-dvh w-full max-w-full">
          <SheetHeader>
            <SheetTitle className="text-left font-mono text-sm font-medium">
              glyn<span className="text-brand">.dev</span>
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-1 flex-col gap-6 px-6 pt-4">
            {items.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                className="text-3xl font-medium tracking-tight"
                onNavigate={() => setOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Separator />
          <div className="flex items-center justify-between px-6 pb-6">
            <ThemeToggle />
            <AuthButton
              onNavigate={() => setOpen(false)}
              onRequestSignIn={() => {
                setOpen(false);
                setSignInOpen(true);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
    </>
  );
}
