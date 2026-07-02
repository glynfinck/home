import { MessageSquare } from "lucide-react";

import { CommentForm } from "@/components/site/comments/comment-form";
import { CommentItem } from "@/components/site/comments/comment-item";
import { CommentSignInPrompt } from "@/components/site/comments/comment-signin-prompt";
import { getCommentsForPost } from "@/lib/data/comments";

/** Server-rendered, never cached — comments are always fresh. */
export async function Comments({
  postId,
  postSlug,
}: {
  postId: string;
  postSlug: string;
}) {
  const { threads, count, userId } = await getCommentsForPost(postId);

  return (
    <section id="comments" className="mt-12 border-t border-border/60 pt-8">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-4 text-brand" />
        <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          {count} {count === 1 ? "comment" : "comments"}
        </h2>
      </div>

      <div className="mt-6">
        {userId ? (
          <CommentForm postId={postId} postSlug={postSlug} />
        ) : (
          <CommentSignInPrompt />
        )}
      </div>

      {threads.length > 0 ? (
        <div className="mt-8 space-y-7">
          {threads.map(({ comment, replies }) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                postId={postId}
                postSlug={postSlug}
                userId={userId}
                canReply={userId !== null}
              />
              {replies.length > 0 ? (
                <div className="mt-4 ml-5 space-y-4 border-l border-border/60 pl-5">
                  {replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      postId={postId}
                      postSlug={postSlug}
                      userId={userId}
                      canReply={userId !== null}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
