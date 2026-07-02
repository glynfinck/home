import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { AdminMobileNav, AdminNavLinks } from "@/components/admin/admin-nav";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

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
          <AdminNavLinks />
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
        <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-md sm:hidden">
          <Link href="/admin" className="font-mono text-sm font-medium">
            glyn<span className="text-brand">.dev</span>
            <span className="ml-2 text-xs text-muted-foreground">admin</span>
          </Link>
          <AdminMobileNav />
        </div>
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
