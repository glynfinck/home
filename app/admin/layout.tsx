import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ExternalLink,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  PenSquare,
  Settings,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/posts", label: "Posts", icon: PenSquare },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/research", label: "Research", icon: FileText },
  { href: "/admin/comments", label: "Comments", icon: MessageSquare },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) redirect("/");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-52 shrink-0 flex-col border-r border-border/60 sm:flex">
        <div className="flex h-14 items-center border-b border-border/60 px-5">
          <Link href="/admin" className="font-mono text-sm font-medium">
            glyn<span className="text-brand">.dev</span>
            <span className="ml-2 text-xs text-muted-foreground">admin</span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
            >
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border/60 p-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="size-4" /> View site
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <div className="flex h-12 items-center gap-4 overflow-x-auto border-b border-border/60 px-4 sm:hidden">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="shrink-0 text-sm text-muted-foreground"
            >
              {label}
            </Link>
          ))}
        </div>
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
