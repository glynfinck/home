import { Skeleton } from "@/components/ui/skeleton";
import { TerminalLoader } from "@/components/site/terminal-loader";

/**
 * One shell for every admin route.
 *
 * The admin layout is `force-dynamic` and every section re-authenticates, so
 * these are the slowest navigations in the app and the ones most in need of a
 * fallback. They are also all the same shape — a heading over a table or a form
 * — which is why one generic shell serves the lot rather than fourteen.
 *
 * This is the one place a route-level loading file is used, and it is a trade,
 * not an oversight. Opening the stream here commits HTTP 200, so the `[id]`
 * editors answer a deleted record with a 200 carrying the not-found page rather
 * than a 404 — the same soft-404 that keeps loading files out of the public
 * trees (see components/site/loading-shell). It is accepted here because admin
 * is `robots: noindex`, reachable only by an authenticated admin, and has no
 * consumer of the status code: nothing crawls it and nothing branches on it.
 * The public routes have all three, which is why they use inline boundaries.
 */
export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <TerminalLoader command="psql -c 'select *'" />

      <div className="mt-6 flex items-center justify-between gap-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="mt-6 divide-y divide-border/60 rounded-lg border border-border/60">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="ml-auto h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
