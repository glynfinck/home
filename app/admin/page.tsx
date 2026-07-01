import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { adminGetStats, adminListComments } from "@/lib/data/admin";
import { formatDate } from "@/lib/format";

export default async function AdminOverviewPage() {
  const [stats, comments] = await Promise.all([
    adminGetStats(),
    adminListComments(),
  ]);

  const tiles = [
    { label: "Posts", value: stats.posts, hint: `${stats.publishedPosts} published` },
    { label: "Post views", value: stats.totalViews, hint: "all time" },
    { label: "Papers", value: stats.papers, hint: `${stats.totalDownloads} downloads` },
    { label: "Comments", value: stats.comments, hint: "all posts" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label} className="bg-card/40">
            <CardHeader>
              <CardDescription className="font-mono text-xs uppercase tracking-widest">
                {tile.label}
              </CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {tile.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{tile.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mt-10 font-mono text-xs tracking-widest text-muted-foreground uppercase">
        Recent comments
      </h2>
      <div className="mt-3 divide-y divide-border/60 rounded-lg border">
        {comments.slice(0, 8).map((comment) => (
          <div key={comment.id} className="flex items-start justify-between gap-4 p-4">
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
        {comments.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No comments yet.</p>
        ) : null}
      </div>
    </div>
  );
}
