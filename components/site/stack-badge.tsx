import { Badge } from "@/components/ui/badge";

/**
 * Tech-stack tag badge with an optional kind icon. Icons come
 * from the `tag_kinds` table, keyed by lowercased tag name — pass the whole
 * map and the badge resolves its own icon.
 */
export function StackBadge({
  tag,
  tagIcons,
}: {
  tag: string;
  tagIcons?: Record<string, string>;
}) {
  const iconUrl = tagIcons?.[tag.toLowerCase()];

  return (
    <Badge variant="outline" className="font-mono text-[11px]">
      {iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={iconUrl}
          alt=""
          aria-hidden
          loading="lazy"
          className="size-3 shrink-0 object-contain"
        />
      ) : null}
      {tag}
    </Badge>
  );
}
