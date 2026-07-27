import { Skeleton } from "@/components/ui/skeleton";
import { TerminalLoader } from "@/components/site/terminal-loader";
import { BREAKPOINTS } from "@/lib/charts/geometry";
import { cn } from "@/lib/utils";

/**
 * The shapes a page falls back to while its data resolves.
 *
 * These are fallbacks for `<Suspense>` boundaries written inside pages, not for
 * `loading.tsx` files, and that is a constraint rather than a preference. A
 * route-level loading file opens the response stream before the page body runs,
 * which commits HTTP 200 — so every route beneath it that calls `notFound()`
 * starts answering unknown slugs with a soft 404. It applies to a loading file
 * *above* the route too: one at `app/(site)/blog/` covers `blog/[slug]` and
 * `blog/tag/[tag]` as well. Every content tree here has a `notFound()` route in
 * it, so the boundaries live in the pages instead. Measured both ways before
 * settling on this: with the loading files in place, /blog/does-not-exist
 * answered 200.
 *
 * Each shell mirrors its page's container and vertical rhythm, because a
 * fallback that does not is a layout shift waiting to happen. Where a
 * measurement is load-bearing it is imported rather than copied: figure heights
 * come from `BREAKPOINTS`, the same constants the server renders the SVG at.
 *
 * `TerminalLoader` carries `role="status"` for a whole shell, so the skeleton
 * blocks stay silent rather than announcing themselves one at a time.
 */

/**
 * A paragraph of the right height with a ragged last line.
 *
 * Uniform-width bars read as a table, not prose; the short final line is what
 * makes the block scan as text at a glance.
 */
export function ParagraphSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-5/12" : "w-full")}
        />
      ))}
    </div>
  );
}

/**
 * Stands in for a figure at exactly the height it will occupy.
 *
 * The wide value is the one that matters: it is what the article column shows
 * above `sm`, and getting it wrong pushes every paragraph below the figure.
 */
export function FigureSkeleton() {
  return (
    <div className="my-8 rounded-lg border border-border/60 bg-card/40 p-4">
      <Skeleton className="h-3.5 w-48" />
      <Skeleton
        className="mt-4 w-full"
        style={{ height: BREAKPOINTS.wide.height }}
      />
      <Skeleton className="mt-3 h-3 w-2/3" />
    </div>
  );
}

/**
 * The prose column, for the boundary around `<Mdx>`.
 *
 * Starts flush with the article's top border: the header above it has already
 * painted from the post row, so a title here would be the second one on screen.
 */
export function ArticleBodySkeleton() {
  return (
    <div className="space-y-8">
      <TerminalLoader command="render article.mdx" />
      <ParagraphSkeleton lines={5} />
      <ParagraphSkeleton lines={3} />
      <FigureSkeleton />
      <ParagraphSkeleton lines={4} />
    </div>
  );
}

/** Post rows, for the blog index and tag pages. */
export function PostRowsSkeleton({
  command,
  rows = 5,
}: {
  command: string;
  rows?: number;
}) {
  return (
    <div>
      <TerminalLoader command={command} />
      <div className="mt-6 divide-y divide-border/60 border-t border-border/60">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="space-y-2.5 py-6">
            <div className="flex items-baseline justify-between gap-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-24 shrink-0" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Card grid, for the projects and research indexes. */
export function CardGridSkeleton({
  command,
  cards = 4,
  columns = "sm:grid-cols-2",
}: {
  command: string;
  cards?: number;
  columns?: string;
}) {
  return (
    <div>
      <TerminalLoader command={command} />
      <div className={cn("mt-6 grid gap-4", columns)}>
        {Array.from({ length: cards }, (_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-6"
          >
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <div className="flex gap-1.5 pt-1">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
