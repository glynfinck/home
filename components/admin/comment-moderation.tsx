"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/delete-button";
import {
  hardDeleteComment,
  setCommentStatus,
} from "@/lib/actions/admin";

export function ModerationActions({
  commentId,
  status,
}: {
  commentId: string;
  status: "visible" | "hidden";
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function toggle() {
    startTransition(async () => {
      const next = status === "visible" ? "hidden" : "visible";
      const result = await setCommentStatus(commentId, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(next === "hidden" ? "Comment hidden" : "Comment visible");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggle}
        disabled={pending}
        aria-label={status === "visible" ? "Hide comment" : "Unhide comment"}
      >
        {status === "visible" ? (
          <EyeOff className="size-4" />
        ) : (
          <Eye className="size-4 text-brand" />
        )}
      </Button>
      <DeleteButton
        label="Comment"
        description="The comment (and its replies) will be permanently deleted."
        action={() => hardDeleteComment(commentId)}
      />
    </div>
  );
}
