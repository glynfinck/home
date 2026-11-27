"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Caret } from "@/components/site/caret";
import { breadcrumb, sharedSegments } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Per-character typing speed, and how long the caret lingers afterwards. */
const TYPE_MS = 28;
const CARET_LINGER_MS = 900;

/** `shown` when nothing is being typed: the whole path, no caret. */
const SETTLED = Number.POSITIVE_INFINITY;

/**
 * The wordmark doubles as the address bar: `glyn.dev/blog/some-post`, with
 * every segment but the last a link back up. It replaces the per-page eyebrow
 * labels and "← Blog" links, so a page can start straight at its title.
 *
 * Width is the thing to get right. The path is as long as the slug, and it
 * shares a row with the nav links, so:
 *   - the wordmark takes whatever the row has left (`flex-1 min-w-0`) and the
 *     nav and icon groups never shrink;
 *   - the root and parent segments keep their full width, since they are the
 *     links, and the last segment gives way with an ellipsis;
 *   - the row clips as a last resort, so nothing can paint over the nav.
 * The full segment stays in `title` and in the accessible name.
 *
 * Typing is done in JS rather than with the CSS reveal in `typed-text.tsx`.
 * That reveal animates a fixed width, which cannot coexist with a segment
 * whose width is whatever is left over. It only runs on client navigation:
 * the server-rendered path is complete, so first paint, crawlers and no-JS
 * visitors never see a partial address.
 */
export function Wordmark({ className }: { className?: string }) {
  const pathname = usePathname();
  const crumbs = breadcrumb(pathname);
  const lengths = crumbs.map((crumb) => crumb.label.length + 1); // + the slash
  const total = lengths.reduce((sum, n) => sum + n, 0);

  const [typing, setTyping] = React.useState({
    path: pathname,
    shown: SETTLED,
  });

  // Derived during render rather than in an effect, so the frame that shows
  // the new page never also shows the new path in full before it is typed.
  if (typing.path !== pathname) {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const kept = lengths
      .slice(0, sharedSegments(typing.path, pathname))
      .reduce((sum, n) => sum + n, 0);
    setTyping({
      path: pathname,
      shown: reduced || kept >= total ? SETTLED : kept,
    });
  }

  const { shown } = typing;
  React.useEffect(() => {
    if (shown === SETTLED) return;
    const timer = setTimeout(
      () =>
        setTyping((state) =>
          state.path === pathname
            ? { ...state, shown: shown >= total ? SETTLED : shown + 1 }
            : state,
        ),
      shown >= total ? CARET_LINGER_MS : TYPE_MS,
    );
    return () => clearTimeout(timer);
  }, [shown, total, pathname]);

  // Characters typed before each segment starts: its slash is character 0.
  const starts = lengths.map((_, i) =>
    lengths.slice(0, i).reduce((sum, n) => sum + n, 0),
  );
  const visible = crumbs.map((crumb, i) => {
    const budget = shown - starts[i];
    return {
      ...crumb,
      slash: budget > 0,
      text: crumb.label.slice(0, Math.max(0, budget - 1)),
      complete: budget >= lengths[i],
    };
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex min-w-0 flex-1 items-baseline overflow-hidden font-mono text-sm font-medium tracking-tight whitespace-nowrap",
        className,
      )}
    >
      <Link
        href="/"
        className="shrink-0 transition-opacity duration-150 hover:opacity-80"
      >
        glyn<span className="text-brand">.dev</span>
      </Link>
      {visible.map((crumb, i) => {
        const last = i === crumbs.length - 1;
        return (
          <React.Fragment key={crumb.href ?? crumb.label}>
            {crumb.slash ? (
              <span aria-hidden className="shrink-0 text-muted-foreground/60">
                /
              </span>
            ) : null}
            {last ? (
              <span
                aria-current="page"
                title={crumb.label}
                className="min-w-0 truncate font-normal text-foreground"
              >
                {crumb.text}
              </span>
            ) : crumb.href && crumb.complete ? (
              <Link
                href={crumb.href}
                className="shrink-0 font-normal text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                {crumb.text}
              </Link>
            ) : (
              <span className="shrink-0 font-normal text-muted-foreground">
                {crumb.text}
              </span>
            )}
          </React.Fragment>
        );
      })}
      {shown !== SETTLED ? <Caret className="shrink-0" /> : null}
    </nav>
  );
}
