import { resolveTagIcon } from "@/lib/tag-icons";

/**
 * The logo in front of a tag chip's label, or nothing for a tag without one.
 * Colour logos are images; black marks are masks filled with the text colour
 * so they read in both themes.
 */
export function TagIcon({
  tag,
  uploaded,
}: {
  tag: string;
  uploaded?: Record<string, string>;
}) {
  const icon = resolveTagIcon(tag, uploaded);
  if (!icon) return null;

  if (icon.mono) {
    const mask = `url("${icon.src}") center / contain no-repeat`;
    return (
      <span
        aria-hidden
        data-tag-icon="mono"
        className="size-3 shrink-0 bg-current"
        style={{ mask, WebkitMask: mask }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={icon.src}
      alt=""
      aria-hidden
      loading="lazy"
      data-tag-icon="image"
      className="size-3 shrink-0 object-contain"
    />
  );
}
