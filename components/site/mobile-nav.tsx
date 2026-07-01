"use client";

import * as React from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavLink } from "@/components/site/nav-link";
import type { NavItem } from "@/lib/nav";

export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu" className="md:hidden">
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-64">
        <SheetHeader>
          <SheetTitle className="text-left font-mono text-sm font-medium">
            glyn<span className="text-brand">.dev</span>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-4 px-4">
          {items.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              className="text-base"
              onNavigate={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
