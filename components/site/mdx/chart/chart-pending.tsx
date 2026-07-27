import { Skeleton } from "@/components/ui/skeleton";
import { BREAKPOINTS } from "@/lib/charts/geometry";

/**
 * A figure's place in the article, held while it resolves.
 *
 * Sized from `BREAKPOINTS`, not from a guess: the narrow and wide plots differ
 * by 54px of height, and picking either one for both breakpoints means every
 * paragraph after the figure jumps when the real SVG arrives. The two heights
 * are swapped by the same `sm:` boundary `ChartFigure` uses to choose which
 * rendered width to show.
 *
 * Deliberately no title text. The chart record holds the title and this
 * component has not read it yet; inventing a placeholder word would be a
 * different kind of lie than an empty bar.
 */
export function ChartPending() {
  return (
    <figure
      className="my-8 rounded-lg border border-border/60 bg-card/40 not-prose"
      aria-hidden="true"
    >
      <div className="border-b border-border/60 px-4 py-3">
        <Skeleton className="h-5 w-52" />
      </div>
      <div className="px-2 pt-4 pb-4 sm:px-4">
        <Skeleton
          className="w-full sm:hidden"
          style={{ height: BREAKPOINTS.narrow.height }}
        />
        <Skeleton
          className="hidden w-full sm:block"
          style={{ height: BREAKPOINTS.wide.height }}
        />
      </div>
      <figcaption className="space-y-2 border-t border-border/60 px-4 py-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/5" />
      </figcaption>
    </figure>
  );
}
