"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SignInButtons } from "@/components/site/sign-in-buttons";

/**
 * Sign-in modal shared by every entry point (navbar, comment box, …).
 *
 * Pass a trigger as `children` for the common case, or drive it with
 * `open`/`onOpenChange` when the trigger lives outside the dialog (e.g. the
 * guest comment composer opens it from several elements at once).
 */
export function SignInDialog({
  children,
  open,
  onOpenChange,
}: {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign in</DialogTitle>
          <DialogDescription>
            Sign in with a third-party account to join the discussion.
          </DialogDescription>
        </DialogHeader>
        <SignInButtons size="default" />
      </DialogContent>
    </Dialog>
  );
}
