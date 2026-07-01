"use client";

import * as React from "react";
import { MessageSquare, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { CommentForm } from "@/components/site/comments/comment-form";
import { deleteOwnComment, editComment } from "@/lib/actions/comments";
import { formatDate } from "@/lib/format";
import type { CommentWithAuthor } from "@/lib/data/comments";

export function CommentItem({
  comment,
  postId,
  postSlug,
  userId,
  canReply,
}: {
  comment: CommentWithAuthor;
  postId: string;
  postSlug: string;
  userId: string | null;
  canReply: boolean;
}) {
  const [replying, setReplying] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [editBody, setEditBody] = React.useState(comment.body);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const isOwn = userId !== null && userId === comment.user_id;
  const name = comment.profiles?.display_name ?? "Anonymous";
  const edited =
    new Date(comment.updated_at).getTime() -
      new Date(comment.created_at).getTime() >
    5_000;

  function saveEdit() {
    startTransition(async () => {
      const result = await editComment(
        { commentId: comment.id, postSlug },
        editBody,
      );
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setEditing(false);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteOwnComment({
        commentId: comment.id,
        postSlug,
      });
      if (result?.error) toast.error(result.error);
      setConfirmDelete(false);
    });
  }

  return (
    <div className="group/comment">
      <div className="flex items-start gap-3">
        <Avatar className="mt-0.5 size-7 border border-border/60">
          <AvatarImage
            src={comment.profiles?.avatar_url ?? undefined}
            alt={name}
          />
          <AvatarFallback className="text-[10px]">
            {name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{name}</span>
            <time
              dateTime={comment.created_at}
              className="font-mono text-xs text-muted-foreground"
            >
              {formatDate(comment.created_at)}
            </time>
            {edited ? (
              <span className="text-xs text-muted-foreground">(edited)</span>
            ) : null}
            {comment.status === "hidden" ? (
              <Badge variant="outline" className="text-[10px]">
                hidden
              </Badge>
            ) : null}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={3}
                maxLength={4000}
                disabled={pending}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={saveEdit}
                  disabled={pending || !editBody.trim()}
                >
                  {pending ? <Spinner /> : null} Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    setEditing(false);
                    setEditBody(comment.body);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
              {comment.body}
            </p>
          )}

          <div className="mt-1.5 flex items-center gap-1">
            {canReply ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={() => setReplying((v) => !v)}
              >
                <MessageSquare className="size-3" /> Reply
              </Button>
            ) : null}
            {isOwn && !editing ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Comment actions"
                    className="h-7 px-2 text-xs text-muted-foreground"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setEditing(true)}>
                    <Pencil className="size-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          {replying ? (
            <div className="mt-3">
              <CommentForm
                postId={postId}
                postSlug={postSlug}
                parentId={comment.parent_id ?? comment.id}
                placeholder={`Reply to ${name}…`}
                autoFocus
                onDone={() => setReplying(false)}
              />
            </div>
          ) : null}
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes your comment from the discussion. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={pending}>
              {pending ? <Spinner /> : null} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
