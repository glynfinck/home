import Link from "next/link";

import { DownloadsChart } from "@/components/admin/downloads-chart";
import { StatTile } from "@/components/admin/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adminGetAnalytics,
  adminGetStats,
  adminListComments,
  type DownloadEvent,
} from "@/lib/data/admin";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const [stats, analytics, comments] = await Promise.all([
    adminGetStats(),
    adminGetAnalytics(30),
    adminListComments(),
  ]);

  const paperTrend = analytics.series.map((day) => day.papers);
  const resumeTrend = analytics.series.map((day) => day.resume);
  const totalDownloads = stats.totalDownloads + stats.totalResumeDownloads;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Traffic and downloads for glyn.dev
          </p>
        </div>
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          last {analytics.days} days
        </p>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Paper downloads"
          value={stats.totalDownloads}
          hint="all time"
          chip={`+${analytics.recentPaperDownloads} in ${analytics.days}d`}
          trend={paperTrend}
          color="var(--series-1)"
        />
        <StatTile
          label="Resume downloads"
          value={stats.totalResumeDownloads}
          hint="all time"
          chip={`+${analytics.recentResumeDownloads} in ${analytics.days}d`}
          trend={resumeTrend}
          color="var(--series-2)"
        />
        {/* No sparkline: `posts.view_count` is a running counter, so there is
            no per-day history to draw. Vercel Web Analytics carries the page
            trend instead. */}
        <StatTile
          label="Post views"
          value={stats.totalViews}
          hint={`${stats.publishedPosts} published`}
        />
        <StatTile
          label="Comments"
          value={stats.comments}
          hint="all posts"
          chip={stats.hiddenComments > 0 ? `${stats.hiddenComments} hidden` : undefined}
        />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle>Downloads</CardTitle>
          </CardHeader>
          <div className="px-(--card-spacing)">
            {totalDownloads > 0 ? (
              <DownloadsChart series={analytics.series} />
            ) : (
              <Empty>No downloads recorded yet.</Empty>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Where from</CardTitle>
          </CardHeader>
          {analytics.topCountries.length > 0 ? (
            <div className="divide-y divide-border/60">
              {analytics.topCountries.map((country) => (
                <div
                  key={country.code}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-(--card-spacing) py-2"
                >
                  <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                    {country.code}
                  </span>
                  <Meter
                    value={country.count}
                    max={analytics.topCountries[0].count}
                  />
                  <span className="font-mono text-sm tabular-nums">
                    {country.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty>
              Country comes from the edge geo-IP header, so it only appears on
              downloads served from production.
            </Empty>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <RankCard
          title="Most downloaded papers"
          rows={analytics.topPapers.map((paper) => ({
            key: paper.slug,
            href: `/research/${paper.slug}`,
            title: paper.title,
            value: paper.download_count,
          }))}
          empty="No papers published yet."
        />
        <RankCard
          title="Most read posts"
          rows={analytics.topPosts.map((post) => ({
            key: post.slug,
            href: `/blog/${post.slug}`,
            title: post.title,
            value: post.view_count,
          }))}
          empty="No published posts yet."
        />
      </div>

      <Card className="mt-4">
        <CardHeader className="border-b">
          <CardTitle>Recent downloads</CardTitle>
        </CardHeader>
        {analytics.events.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {["What", "Who", "From", "Country", "When (UTC)"].map((head) => (
                    <th
                      key={head}
                      className="px-(--card-spacing) pb-2 text-left font-mono text-[10px] font-normal tracking-widest whitespace-nowrap text-muted-foreground uppercase"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {analytics.events.slice(0, 12).map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Nothing downloaded in the last {analytics.days} days.</Empty>
        )}
      </Card>

      <Card className="mt-4">
        <CardHeader className="border-b">
          <CardTitle>Recent comments</CardTitle>
        </CardHeader>
        <div className="divide-y divide-border/60">
          {comments.slice(0, 5).map((comment) => (
            <div
              key={comment.id}
              className="flex items-start justify-between gap-4 px-(--card-spacing) py-3"
            >
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-medium">
                    {comment.profiles?.display_name ?? "Anonymous"}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    on{" "}
                    <Link
                      href={`/blog/${comment.posts?.slug}`}
                      className="text-brand hover:underline"
                    >
                      {comment.posts?.title}
                    </Link>
                  </span>
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {comment.body}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {comment.status === "hidden" ? (
                  <Badge variant="outline">hidden</Badge>
                ) : null}
                {comment.deleted_at ? (
                  <Badge variant="outline">deleted</Badge>
                ) : null}
                <span className="font-mono text-xs text-muted-foreground">
                  {formatDate(comment.created_at)}
                </span>
              </div>
            </div>
          ))}
          {comments.length === 0 ? <Empty>No comments yet.</Empty> : null}
        </div>
      </Card>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-(--card-spacing) text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function Meter({ value, max }: { value: number; max: number }) {
  return (
    <span className="block h-1 overflow-hidden rounded-full bg-muted">
      <span
        className="block h-full rounded-full bg-series-1"
        style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
      />
    </span>
  );
}

type RankRow = {
  key: string;
  href: string;
  title: string;
  value: number;
};

function RankCard({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: RankRow[];
  empty: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 0);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {rows.length > 0 ? (
        <div className="divide-y divide-border/60">
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-(--card-spacing) py-2.5"
            >
              <div className="min-w-0">
                <Link
                  href={row.href}
                  className="block truncate text-sm transition-colors duration-150 hover:text-brand"
                  title={row.title}
                >
                  {row.title}
                </Link>
                <div className="mt-1.5">
                  <Meter value={row.value} max={max} />
                </div>
              </div>
              <span className="font-mono text-sm tabular-nums">
                {row.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <Empty>{empty}</Empty>
      )}
    </Card>
  );
}

function EventRow({ event }: { event: DownloadEvent }) {
  const href = event.slug ? `/research/${event.slug}` : null;

  return (
    <tr>
      <td className="px-(--card-spacing) py-2.5">
        <span className="flex min-w-0 items-center gap-2.5">
          {/* The stripe repeats the chart's colour coding, but the label
              beside it is what actually identifies the file. */}
          <span
            className={cn(
              "h-5 w-[3px] shrink-0 rounded-full",
              event.kind === "paper" ? "bg-series-1" : "bg-series-2",
            )}
          />
          {href ? (
            <Link
              href={href}
              className="max-w-[22rem] truncate transition-colors duration-150 hover:text-brand"
              title={event.label}
            >
              {event.label}
            </Link>
          ) : (
            <span className="max-w-[22rem] truncate">{event.label}</span>
          )}
        </span>
      </td>
      <td className="px-(--card-spacing) py-2.5 whitespace-nowrap">
        {event.who ?? (
          <span className="text-muted-foreground">Not signed in</span>
        )}
      </td>
      <td className="px-(--card-spacing) py-2.5">
        <span className="block max-w-[18rem] truncate font-mono text-xs text-muted-foreground">
          {formatReferrer(event.referrer)}
        </span>
      </td>
      <td className="px-(--card-spacing) py-2.5 font-mono text-xs text-muted-foreground">
        {event.country ?? "—"}
      </td>
      <td className="px-(--card-spacing) py-2.5 font-mono text-xs whitespace-nowrap text-muted-foreground">
        {formatDateTime(event.at)}
      </td>
    </tr>
  );
}

/**
 * Own-site referrers show as a path (which page the download started from);
 * anything external shows as its host, which is the interesting case.
 */
function formatReferrer(referrer: string | null) {
  if (!referrer) return "direct";
  try {
    const url = new URL(referrer);
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    const own = site ? new URL(site).host : null;
    return url.host === own ? url.pathname : url.host;
  } catch {
    return referrer;
  }
}
