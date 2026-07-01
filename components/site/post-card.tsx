import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { PostListItem } from "@/lib/data/posts";

export function PostRow({ post }: { post: PostListItem }) {
  return (
    <article className="group py-6">
      <div className="flex items-baseline justify-between gap-4">
        <Link href={`/blog/${post.slug}`} className="min-w-0">
          <h3 className="font-medium tracking-tight transition-colors duration-150 group-hover:text-brand">
            {post.title}
          </h3>
        </Link>
        <time
          dateTime={post.published_at ?? undefined}
          className="shrink-0 font-mono text-xs text-muted-foreground"
        >
          {formatDate(post.published_at)}
        </time>
      </div>
      {post.excerpt ? (
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
          {post.excerpt}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {post.tags.map((tag) => (
          <Badge key={tag} variant="secondary" asChild>
            <Link href={`/blog/tag/${encodeURIComponent(tag)}`}>{tag}</Link>
          </Badge>
        ))}
        {post.reading_minutes ? (
          <span className="font-mono text-xs text-muted-foreground">
            {post.reading_minutes} min read
          </span>
        ) : null}
      </div>
    </article>
  );
}
