"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { addComment } from "@/lib/actions/comments";

export function CommentForm({
  postId,
  postSlug,
  parentId = null,
  placeholder = "Add a comment…",
  autoFocus = false,
  onDone,
}: {
  postId: string;
  postSlug: string;
  parentId?: string | null;
  placeholder?: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const [body, setBody] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function submit() {
    startTransition(async () => {
      const result = await addComment({ postId, postSlug, parentId }, body);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setBody("");
      onDone?.();
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={4000}
        autoFocus={autoFocus}
        disabled={pending}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && body.trim()) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Plain text · <kbd className="font-mono">⌘↵</kbd> to post
        </p>
        <div className="flex items-center gap-2">
          {onDone ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={onDone}
            >
              Cancel
            </Button>
          ) : null}
          <Button size="sm" disabled={pending || !body.trim()} onClick={submit}>
            {pending ? <Spinner /> : null}
            {parentId ? "Reply" : "Comment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
