"use client";

import * as React from "react";
import { Plus, Tag, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type TagOption = { name: string; iconUrl: string | null };

function KindIcon({ iconUrl }: { iconUrl: string | null }) {
  return iconUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={iconUrl}
      alt=""
      aria-hidden
      className="size-3.5 shrink-0 object-contain"
    />
  ) : (
    <Tag className="size-3.5 shrink-0 text-muted-foreground/50" />
  );
}

/**
 * Searchable tag input for the admin editors: suggests existing tags (with
 * their kind icons from /admin/kinds), still allows creating new ones by
 * typing.
 */
export function TagPicker({
  value,
  onChange,
  options,
  placeholder = "Search tags or type a new one",
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  options: TagOption[];
  placeholder?: string;
}) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);

  const icons = React.useMemo(
    () =>
      new Map(
        options
          .filter((option) => option.iconUrl)
          .map((option) => [option.name, option.iconUrl]),
      ),
    [options],
  );

  const q = query.trim().toLowerCase();
  const matches = options
    .filter((option) => !value.includes(option.name))
    .filter((option) => !q || option.name.includes(q))
    .slice(0, 10);
  const canCreate =
    q.length > 0 &&
    !value.includes(q) &&
    !options.some((option) => option.name === q);
  const rowCount = matches.length + (canCreate ? 1 : 0);
  const active = Math.min(highlight, rowCount - 1);

  function add(tag: string) {
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setQuery("");
    setHighlight(0);
  }

  function pick(index: number) {
    if (index < 0 || rowCount === 0) return;
    add(index < matches.length ? matches[index].name : q);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Commit typed text on blur; row clicks preventDefault on
            // mousedown so they never race this.
            if (q) add(q);
            setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHighlight(Math.min(active + 1, rowCount - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight(Math.max(active - 1, 0));
            } else if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              if (open && rowCount > 0) pick(active);
              else if (q) add(q);
            } else if (e.key === "Escape") {
              setOpen(false);
            } else if (e.key === "Backspace" && !query && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
        />
        {open && rowCount > 0 ? (
          <div
            role="listbox"
            className="absolute top-full z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
            onMouseDown={(e) => e.preventDefault()}
          >
            {matches.map((option, index) => (
              <button
                key={option.name}
                type="button"
                role="option"
                aria-selected={index === active}
                onClick={() => pick(index)}
                onMouseEnter={() => setHighlight(index)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left font-mono text-sm",
                  index === active && "bg-accent text-accent-foreground",
                )}
              >
                <KindIcon iconUrl={option.iconUrl} />
                {option.name}
              </button>
            ))}
            {canCreate ? (
              <button
                type="button"
                role="option"
                aria-selected={active === matches.length}
                onClick={() => pick(matches.length)}
                onMouseEnter={() => setHighlight(matches.length)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                  active === matches.length && "bg-accent text-accent-foreground",
                )}
              >
                <Plus className="size-3.5 shrink-0 text-muted-foreground" />
                Add <span className="font-mono">{q}</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 font-mono">
              {icons.get(tag) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={icons.get(tag)!}
                  alt=""
                  aria-hidden
                  className="size-3 shrink-0 object-contain"
                />
              ) : null}
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="rounded-full outline-none hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
