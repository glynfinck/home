"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/site/sign-in-dialog";

/**
 * Guest-facing stand-in for the comment composer. It looks like the real
 * editor, but any interaction opens the sign-in modal instead of letting an
 * unauthenticated visitor type. After signing in the page re-renders with the
 * live <CommentForm> in the same spot, so the transition feels seamless.
 */
export function CommentSignInPrompt() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <div className="space-y-2">
        <button
          type="button"
          aria-label="Sign in to comment"
          onClick={() => setOpen(true)}
          className="flex min-h-20 w-full cursor-pointer items-start rounded-lg border border-input bg-transparent px-2.5 py-2 text-base text-muted-foreground transition-colors outline-none hover:border-ring/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        >
          Add a comment…
        </button>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Sign in to join the discussion
          </p>
          <Button size="sm" onClick={() => setOpen(true)}>
            Comment
          </Button>
        </div>
      </div>
      <SignInDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
