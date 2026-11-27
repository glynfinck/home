/**
 * Logos for technology tags.
 *
 * Every logo is a row in `tag_kinds`, managed at /admin/kinds: an icon, a
 * `mono` flag, and `aliases` (other spellings that show the same logo).
 * Only technologies (`tech_stack` on posts and projects) get icons; topics
 * stay plain chips.
 *
 * Tags are free text ("C++", "Next.js", "Tailwind CSS", "kdb"), so names,
 * aliases and tags all go through `tagKey`, which folds them to a bare
 * lowercase form ("cplusplus", "nextjs", "tailwindcss"). The database has the
 * same function as `public.tag_key`.
 */

export type TagIcon = {
  src: string;
  /** Draw as a silhouette in `currentColor` instead of as an image. */
  mono: boolean;
};

/** Icons by `tagKey`, for kind names and their aliases. */
export type TagIconMap = Record<string, TagIcon>;

type KindLike = {
  name: string;
  icon_url: string;
  mono: boolean;
  aliases: string[];
};

/** "C++" → "cplusplus", "Next.js" → "nextjs", "Tailwind CSS" → "tailwindcss". */
export function tagKey(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/#/g, "sharp")
    .replace(/[^a-z0-9]/g, "");
}

/** The lookup map for `resolveTagIcon`. A kind's own name beats an alias. */
export function buildTagIconMap(kinds: KindLike[]): TagIconMap {
  const map: TagIconMap = {};
  for (const kind of kinds) {
    const icon = { src: kind.icon_url, mono: kind.mono };
    for (const alias of kind.aliases) {
      const key = tagKey(alias);
      if (key && !(key in map)) map[key] = icon;
    }
  }
  for (const kind of kinds) {
    map[tagKey(kind.name)] = { src: kind.icon_url, mono: kind.mono };
  }
  return map;
}

/** The icon for a tag, or null when it has none. */
export function resolveTagIcon(
  tag: string,
  icons: TagIconMap | undefined,
): TagIcon | null {
  return icons?.[tagKey(tag)] ?? null;
}
