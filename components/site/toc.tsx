"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { TocEntry } from "@/lib/toc";

/**
 * Article outline. Renders as a sticky rail beside the prose at `xl`, and as a
 * collapsed disclosure above the article below that.
 *
 * The active-section highlight is progressive enhancement: with JS off the
 * links still work, they just don't track scroll position.
 */
export function Toc({
  entries,
  variant,
}: {
  entries: TocEntry[];
  /**
   * `rail` is the sticky sidebar rendered into the article grid's first
   * column at `xl`; `inline` is the collapsed disclosure above the prose on
   * narrower screens. They render in different grid cells, so this is a prop
   * rather than one component toggling its own visibility.
   */
  variant: "rail" | "inline";
}) {
  const activeId = useActiveHeading(entries);

  // One or two headings is a list, not an outline. Not worth the chrome.
  if (entries.length < 3) return null;

  if (variant === "rail") {
    return (
      <nav
        aria-labelledby="toc-heading"
        className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto print:hidden"
      >
        <p
          id="toc-heading"
          className="font-mono text-xs tracking-widest text-brand uppercase"
        >
          Contents
        </p>
        <TocList entries={entries} activeId={activeId} className="mt-4" />
      </nav>
    );
  }

  return (
    <details className="group mb-10 rounded-lg border border-border/60 bg-card/40 print:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-mono text-xs tracking-widest text-brand uppercase [&::-webkit-details-marker]:hidden">
        Contents
        <span
          aria-hidden
          className="text-muted-foreground transition-transform duration-150 group-open:rotate-90"
        >
          &rsaquo;
        </span>
      </summary>
      <TocList
        entries={entries}
        activeId={activeId}
        className="px-4 pt-1 pb-4"
      />
    </details>
  );
}

function TocList({
  entries,
  activeId,
  className,
}: {
  entries: TocEntry[];
  activeId: string | null;
  className?: string;
}) {
  return (
    <ul className={cn("space-y-1 text-sm", className)}>
      {entries.map((entry) => {
        const active = entry.id === activeId;
        return (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              aria-current={active ? "location" : undefined}
              className={cn(
                "block border-l py-1 pl-3 transition-colors duration-150 hover:text-foreground",
                entry.depth === 3 && "pl-6",
                active
                  ? "border-brand text-foreground"
                  : "border-border/60 text-muted-foreground",
              )}
            >
              {entry.text}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Tracks which heading the reader is in.
 *
 * A plain "first intersecting element" rule flickers when a short section sits
 * fully on screen next to a long one, so this keeps the *last* heading whose
 * top has passed the reading line instead, which is stable while scrolling in
 * either direction.
 */
function useActiveHeading(entries: TocEntry[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Join the ids so the effect re-runs when the outline itself changes, not on
  // every render of a new array with the same contents.
  const ids = entries.map((e) => e.id).join(",");

  useEffect(() => {
    const headingIds = ids ? ids.split(",") : [];
    if (headingIds.length === 0) return;

    const elements = headingIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      // A quarter viewport down reads as "what am I looking at" better than
      // the very top, which flips a beat before the heading is legible.
      const line = window.innerHeight * 0.25;
      let current: string | null = null;
      for (const el of elements) {
        if (el.getBoundingClientRect().top <= line) current = el.id;
        else break;
      }
      // Before the first heading scrolls past, highlight nothing rather than
      // pinning section one while the reader is still in the intro.
      setActiveId(current);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ids]);

  return activeId;
}
