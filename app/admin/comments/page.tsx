import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ModerationActions } from "@/components/admin/comment-moderation";
import { adminListComments } from "@/lib/data/admin";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function AdminCommentsPage() {
  const comments = await adminListComments();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Comments</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Post-moderation: comments are live immediately — hide or delete
        anything that doesn&apos;t belong.
      </p>

      <div className="mt-6 divide-y divide-border/60 rounded-lg border">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className={cn(
              "flex items-start justify-between gap-4 p-4",
              (comment.status === "hidden" || comment.deleted_at) &&
                "opacity-60",
            )}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">
                  {comment.profiles?.display_name ?? "Anonymous"}
                </span>
                <span className="text-muted-foreground">on</span>
                <Link
                  href={`/blog/${comment.posts?.slug}#comments`}
                  className="truncate text-brand hover:underline"
                >
                  {comment.posts?.title}
                </Link>
                <time className="font-mono text-xs text-muted-foreground">
                  {formatDate(comment.created_at)}
                </time>
                {comment.parent_id ? (
                  <Badge variant="outline" className="text-[10px]">
                    reply
                  </Badge>
                ) : null}
                {comment.status === "hidden" ? (
                  <Badge variant="outline" className="text-[10px]">
                    hidden
                  </Badge>
                ) : null}
                {comment.deleted_at ? (
                  <Badge variant="outline" className="text-[10px]">
                    deleted by author
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1.5 text-sm whitespace-pre-wrap text-muted-foreground">
                {comment.body}
              </p>
            </div>
            {!comment.deleted_at ? (
              <ModerationActions
                commentId={comment.id}
                status={comment.status}
              />
            ) : null}
          </div>
        ))}
        {comments.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No comments yet.</p>
        ) : null}
      </div>
    </div>
  );
}
