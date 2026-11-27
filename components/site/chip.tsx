import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The one chip on the public site: blog tags, research topics and tech stack.
 *
 * They used to be three looks (a filled sans pill for tags, a mono outline for
 * topics and stack), so the same word read as two different kinds of thing
 * depending on the page. Now a chip is always a mono outline, and the only
 * filled chip is the active filter.
 */
export function Chip({
  href,
  active = false,
  className,
  children,
}: {
  /** Makes the chip a link. Without it the chip is a label. */
  href?: string;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const classes = cn(
    "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-full border border-foreground/15 px-2 font-mono text-[11px] leading-none whitespace-nowrap text-foreground",
    href &&
      "outline-none transition-colors duration-150 hover:border-foreground/35 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
    active &&
      "border-brand bg-brand font-medium text-background hover:border-brand hover:bg-brand",
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={classes}
      >
        {children}
      </Link>
    );
  }
  return <span className={classes}>{children}</span>;
}
