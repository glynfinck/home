import { Chip } from "@/components/site/chip";

/**
 * Tech-stack chip with an optional kind icon. Icons come from the `tag_kinds`
 * table, keyed by lowercased tag name — pass the whole map and the chip
 * resolves its own icon.
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
    <Chip>
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
    </Chip>
  );
}
