"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command as CommandPrimitive } from "cmdk";
import { useTheme } from "next-themes";
import {
  ArrowUpRight,
  Check,
  FileText,
  FolderGit2,
  Hash,
  Moon,
  Newspaper,
  Rss,
  Sun,
} from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { SearchGroup, SearchItem } from "@/lib/data/search";
import { NAV_ITEMS } from "@/lib/nav";

const GROUP_ORDER: SearchGroup[] = ["Posts", "Research", "Projects", "Tags"];

const GROUP_ICON = {
  Posts: Newspaper,
  Research: FileText,
  Projects: FolderGit2,
  Tags: Hash,
} as const;

/**
 * Terminal-styled command palette (⌘K / Ctrl K).
 *
 * The site had no search at all, so this is the discovery surface as much as
 * it is a power-user shortcut. Two consequences shape it:
 *
 * - It must not be keyboard-only. `SearchTrigger` in the navbar opens it, and
 *   the mobile nav has an entry, so it is reachable without knowing the chord.
 * - The index loads on *first open*, not on mount, so a visitor who never
 *   opens it pays nothing.
 *
 * `cmdk` supplies combobox ARIA, roving focus and scoring; the terminal
 * dressing is the `$` prompt, mono type and the hint footer.
 */
export function CommandPalette({ email }: { email?: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  // Guards the one-shot fetch. A ref, not state, so repeated calls in the
  // same tick can't race a pending re-render into a second request.
  const requested = useRef(false);

  const loadIndex = useCallback(() => {
    if (requested.current) return;
    requested.current = true;
    setLoading(true);
    fetch("/api/search-index")
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((data: { items: SearchItem[] }) => setItems(data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  // Kicked off from the open path rather than an effect on `open`, so the
  // fetch is a response to intent instead of a state-change side effect.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) loadIndex();
      setOpen(next);
    },
    [loadIndex],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k") return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      // Idempotent, so calling it on the closing half of the toggle is free.
      loadIndex();
      setOpen((prev) => !prev);
    }
    // Listen on the document so the chord works wherever focus is.
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [loadIndex]);

  useEffect(() => {
    function onOpenRequest() {
      handleOpenChange(true);
    }
    window.addEventListener("open-command-palette", onOpenRequest);
    return () =>
      window.removeEventListener("open-command-palette", onOpenRequest);
  }, [handleOpenChange]);

  const run = useCallback((action: () => void) => {
    setOpen(false);
    setQuery("");
    action();
  }, []);

  // A leading `/` is treated as a path, so `/blog/tag/quant` navigates
  // straight there. Harmless if unnoticed, quick if you know it.
  const pathMode = query.startsWith("/");

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    entries: (items ?? []).filter((item) => item.group === group),
  })).filter(({ entries }) => entries.length > 0);

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Search glyn.dev"
      description="Search posts, research, projects and tags, or jump to a page."
      className="top-[15%] max-w-xl border-border/80 p-0"
    >
      <Command
        // The site's own scorer would fight cmdk's; let cmdk rank and only
        // filter out the path-mode case, where the query is a URL not a term.
        shouldFilter={!pathMode}
        className="rounded-xl bg-popover"
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3 font-mono text-sm">
          <span aria-hidden className="text-brand">
            $
          </span>
          <CommandPrimitive.Input
            value={query}
            onValueChange={setQuery}
            placeholder="search posts, papers, projects…"
            className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground/70"
          />
        </div>

        <CommandList className="max-h-[60vh] px-1 py-1">
          {pathMode ? (
            <CommandGroup heading="Go to path">
              <CommandItem
                value={query}
                onSelect={() => run(() => router.push(query))}
                className="font-mono"
              >
                <ArrowUpRight className="text-brand" />
                {query}
              </CommandItem>
            </CommandGroup>
          ) : null}

          {!pathMode ? (
            <CommandEmpty className="py-8 font-mono text-sm text-muted-foreground">
              {loading ? "$ searching…" : "$ no matches. try a tag?"}
            </CommandEmpty>
          ) : null}

          {!pathMode
            ? grouped.map(({ group, entries }) => {
                const Icon = GROUP_ICON[group];
                return (
                  <CommandGroup key={group} heading={group}>
                    {entries.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`${item.title} ${item.keywords.join(" ")}`}
                        onSelect={() => run(() => router.push(item.href))}
                      >
                        <Icon className="text-muted-foreground" />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{item.title}</span>
                          {item.subtitle ? (
                            <span className="truncate text-xs text-muted-foreground">
                              {item.subtitle}
                            </span>
                          ) : null}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })
            : null}

          {!pathMode ? (
            <>
              <CommandGroup heading="Go to">
                {NAV_ITEMS.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={`go ${item.label} ${item.href}`}
                    onSelect={() => run(() => router.push(item.href))}
                  >
                    <ArrowUpRight className="text-muted-foreground" />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandGroup heading="Actions">
                <CommandItem
                  value="toggle theme dark light appearance"
                  onSelect={() =>
                    run(() =>
                      setTheme(resolvedTheme === "dark" ? "light" : "dark"),
                    )
                  }
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="text-muted-foreground" />
                  ) : (
                    <Moon className="text-muted-foreground" />
                  )}
                  Switch to {resolvedTheme === "dark" ? "light" : "dark"} theme
                </CommandItem>

                {email ? (
                  <CommandItem
                    value="copy email address contact"
                    onSelect={() => {
                      navigator.clipboard?.writeText(email).then(
                        () => setCopied(true),
                        () => setCopied(false),
                      );
                      setTimeout(() => setOpen(false), 250);
                    }}
                  >
                    {copied ? (
                      <Check className="text-brand" />
                    ) : (
                      <Hash className="text-muted-foreground" />
                    )}
                    {copied ? "Copied" : `Copy email · ${email}`}
                  </CommandItem>
                ) : null}

                <CommandItem
                  value="rss feed subscribe"
                  onSelect={() => run(() => router.push("/rss.xml"))}
                >
                  <Rss className="text-muted-foreground" />
                  RSS feed
                </CommandItem>
              </CommandGroup>
            </>
          ) : null}
        </CommandList>

        <div className="flex items-center justify-between gap-4 border-t border-border/60 px-4 py-2 font-mono text-[11px] text-muted-foreground">
          <span>↑↓ move · ↵ open · esc close</span>
          <span className="hidden sm:inline">/ for a path</span>
        </div>
      </Command>
    </CommandDialog>
  );
}
