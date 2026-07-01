"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const bodySchema = z.string().trim().min(1, "Comment cannot be empty").max(
  4000,
  "Comment is too long (4000 characters max)",
);

export type CommentActionState = { error?: string } | null;

/**
 * All mutations run under the caller's session — RLS is the enforcement:
 * users can only insert as themselves on published posts, and only
 * update/soft-delete their own rows.
 */

export async function addComment(
  input: {
    postId: string;
    postSlug: string;
    parentId?: string | null;
  },
  body: string,
): Promise<CommentActionState> {
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to comment." };

  const { error } = await supabase.from("comments").insert({
    post_id: input.postId,
    parent_id: input.parentId ?? null,
    user_id: user.id,
    body: parsed.data,
  });

  if (error) return { error: "Could not post comment. Please try again." };

  revalidatePath(`/blog/${input.postSlug}`);
  return null;
}

export async function editComment(
  input: { commentId: string; postSlug: string },
  body: string,
): Promise<CommentActionState> {
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("comments")
    .update({ body: parsed.data }, { count: "exact" })
    .eq("id", input.commentId);

  if (error || count === 0) return { error: "Could not update comment." };

  revalidatePath(`/blog/${input.postSlug}`);
  return null;
}

export async function deleteOwnComment(input: {
  commentId: string;
  postSlug: string;
}): Promise<CommentActionState> {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", input.commentId);

  if (error || count === 0) return { error: "Could not delete comment." };

  revalidatePath(`/blog/${input.postSlug}`);
  return null;
}
