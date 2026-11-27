import Link from "next/link";

import { LinkPending } from "@/components/site/route-progress";
import { formatMonthDay, yearOf } from "@/lib/format";
import type { PostListItem } from "@/lib/data/posts";
import { cn } from "@/lib/utils";

/**
 * Posts as a dated log: the date sits in a fixed gutter, so dates line up in a
 * column and the title has the rest of the row to itself.
 *
 * `groupByYear` is for lists in date order (the index, tag pages, the home
 * page), where the year is a heading and the gutter carries only month and
 * day. Lists in another order (related posts, ranked by similarity) keep the
 * year in the gutter under the date, because a year heading would repeat.
 */
export function PostLog({
  posts,
  groupByYear = true,
  className,
}: {
  posts: PostListItem[];
  groupByYear?: boolean;
  className?: string;
}) {
  if (!groupByYear) {
    return (
      <div className={cn("divide-y divide-border/60", className)}>
        {posts.map((post) => (
          <PostLogRow key={post.id} post={post} showYear />
        ))}
      </div>
    );
  }

  const years: { year: string; posts: PostListItem[] }[] = [];
  for (const post of posts) {
    const year = yearOf(post.published_at);
    const group = years.at(-1);
    if (group && group.year === year) group.posts.push(post);
    else years.push({ year, posts: [post] });
  }

  return (
    <div className={cn("space-y-10", className)}>
      {years.map(({ year, posts: inYear }) => (
        <section key={year} aria-label={year || "Undated"}>
          <p className="border-b border-border/60 pb-2 font-mono text-xs tracking-widest text-brand">
            {year || "undated"}
          </p>
          <div className="divide-y divide-border/60">
            {inYear.map((post) => (
              <PostLogRow key={post.id} post={post} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PostLogRow({
  post,
  showYear = false,
}: {
  post: PostListItem;
  showYear?: boolean;
}) {
  return (
    <article className="group relative grid grid-cols-[3.75rem_minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 py-4">
      <time
        dateTime={post.published_at ?? undefined}
        className="font-mono text-xs text-muted-foreground tabular-nums"
      >
        {formatMonthDay(post.published_at)}
      </time>
      {/* Stretched over the row: the title changes colour when any part of
          the row is hovered, so any part of it opens the post. */}
      <Link
        href={`/blog/${post.slug}`}
        className="min-w-0 outline-none after:absolute after:inset-0 focus-visible:after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-ring"
      >
        <h3 className="font-medium tracking-tight transition-colors duration-150 group-hover:text-brand">
          {post.title}
        </h3>
        <LinkPending />
      </Link>
      <span className="font-mono text-xs text-muted-foreground tabular-nums">
        {post.reading_minutes ? `${post.reading_minutes} min` : null}
      </span>
      {showYear ? (
        <span className="font-mono text-xs text-muted-foreground/70 tabular-nums">
          {yearOf(post.published_at)}
        </span>
      ) : null}
      {post.excerpt ? (
        // Rows span the page; the excerpt keeps a reading measure.
        <p className="col-start-2 line-clamp-2 max-w-3xl text-sm text-muted-foreground">
          {post.excerpt}
        </p>
      ) : null}
    </article>
  );
}
