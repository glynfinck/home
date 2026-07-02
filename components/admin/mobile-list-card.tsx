import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";

/**
 * Card used on the admin list pages below `sm`, where the multi-column tables
 * would otherwise scroll off-screen. The whole card is a tap target to the edit
 * page; `children` holds the per-type meta (tags, counts, dates, …).
 */
export function MobileListCard({
  href,
  title,
  slug,
  status,
  children,
}: {
  href: string;
  title: string;
  slug: string;
  status: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border p-4 transition-colors hover:border-brand/40 hover:bg-accent/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{title}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            /{slug}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
      {children ? <div className="mt-3 space-y-2">{children}</div> : null}
    </Link>
  );
}
