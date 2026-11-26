import type { Highlight } from "@/lib/highlights";
import { cn } from "@/lib/utils";

/**
 * A paper's headline numbers, set in mono. The figure that went against the
 * hypothesis is amber: the honest number is the one that should stand out.
 *
 * `-` in a value is typeset as a true minus so it aligns with the digits.
 */
export function Highlights({
  items,
  size = "card",
  className,
}: {
  items: Highlight[];
  /** `card` is the compact strip on a research card; `page` opens a paper. */
  size?: "card" | "page";
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border/60 bg-border/60",
        items.length >= 4 ? "sm:grid-cols-4" : "sm:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "flex flex-col justify-between gap-1 bg-background",
            size === "page" ? "px-4 py-3" : "px-3 py-2.5",
          )}
        >
          <dt className="font-mono text-[10px] leading-tight tracking-wider text-muted-foreground uppercase">
            {item.label}
          </dt>
          <dd
            className={cn(
              "font-mono tabular-nums",
              size === "page" ? "text-xl" : "text-base",
              item.tone === "negative" ? "text-series-2" : "text-foreground",
            )}
          >
            {item.value.replace(/^-/, "−")}
          </dd>
        </div>
      ))}
    </dl>
  );
}
