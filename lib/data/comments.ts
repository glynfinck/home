import { unstable_noStore } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/helpers";

export type CommentWithAuthor = Tables<"comments"> & {
  profiles: Pick<Tables<"profiles">, "display_name" | "avatar_url"> | null;
};

export type CommentThread = {
  comment: CommentWithAuthor;
  replies: CommentWithAuthor[];
};

/**
 * Always-fresh comment fetch (never cached). Runs under the caller's RLS:
 * visitors see visible comments; admins also see hidden ones.
 */
export async function getCommentsForPost(postId: string): Promise<{
  threads: CommentThread[];
  count: number;
  userId: string | null;
}> {
  unstable_noStore();

  const supabase = await createClient();

  const [{ data: comments, error }, { data: userData }] = await Promise.all([
    supabase
      .from("comments")
      // RLS may return soft-deleted rows to their owner/admin; hide them
      // from the thread for everyone.
      .select("*, profiles(display_name, avatar_url)")
      .eq("post_id", postId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  if (error) throw error;

  const all = comments as CommentWithAuthor[];
  const topLevel = all.filter((c) => c.parent_id === null);
  const replies = all.filter((c) => c.parent_id !== null);

  const threads: CommentThread[] = topLevel.map((comment) => ({
    comment,
    replies: replies.filter((r) => r.parent_id === comment.id),
  }));

  // Replies whose parent was soft-deleted/hidden still deserve a home
  const orphaned = replies.filter(
    (r) => !topLevel.some((c) => c.id === r.parent_id),
  );
  for (const orphan of orphaned) {
    threads.push({ comment: orphan, replies: [] });
  }
  threads.sort(
    (a, b) =>
      new Date(a.comment.created_at).getTime() -
      new Date(b.comment.created_at).getTime(),
  );

  return { threads, count: all.length, userId: userData.user?.id ?? null };
}
