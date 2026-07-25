"use client";

import { useSyncExternalStore } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Ask the palette to open. Decoupled so any surface can trigger it. */
export function openCommandPalette() {
  window.dispatchEvent(new Event("open-command-palette"));
}

/**
 * Visible entry point for the command palette.
 *
 * A ⌘K-only palette is invisible to anyone who doesn't already know the
 * convention, which is most visitors. This is the affordance that makes the
 * feature discoverable, and on touch it is the only way in.
 */
export function SearchTrigger({
  className,
  variant = "compact",
  onActivate,
}: {
  className?: string;
  /** `compact` is the navbar pill; `full` is the wide row in the mobile nav. */
  variant?: "compact" | "full";
  /**
   * Runs before the palette opens. The mobile nav uses it to close its sheet
   * first, so two focus traps are never mounted at once.
   */
  onActivate?: () => void;
}) {
  const shortcut = useShortcutLabel();

  function activate() {
    onActivate?.();
    openCommandPalette();
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={activate}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-4 py-3 text-left text-muted-foreground transition-colors duration-150 hover:text-foreground",
          className,
        )}
      >
        <Search className="size-4 shrink-0" />
        <span className="font-mono text-sm">Search</span>
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={activate}
      aria-label="Search"
      aria-keyshortcuts="Meta+K Control+K"
      className={cn("gap-2 text-muted-foreground", className)}
    >
      <Search className="size-4" />
      {/* Rendered only after mount: the label depends on the platform, and
          guessing it on the server would hydrate wrong half the time. */}
      {shortcut ? (
        <kbd className="hidden rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] lg:inline">
          {shortcut}
        </kbd>
      ) : null}
    </Button>
  );
}

/** No-op subscribe: the platform never changes for the life of the page. */
const subscribeNever = () => () => {};

const getShortcutLabel = () =>
  /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? "⌘K" : "Ctrl K";

/** The server has no platform to detect, so it renders no key hint. */
const getServerShortcutLabel = () => null;

/**
 * The ⌘K vs Ctrl K label is client-only knowledge.
 *
 * `useSyncExternalStore` rather than an effect: it gives React an explicit
 * server snapshot, so the markup is stable through hydration instead of
 * flipping via a setState that triggers a second render pass.
 */
function useShortcutLabel(): string | null {
  return useSyncExternalStore(
    subscribeNever,
    getShortcutLabel,
    getServerShortcutLabel,
  );
}
