/**
 * Logos for technology tags.
 *
 * Tags are free text ("C++", "Next.js", "Tailwind CSS", "kdb"), so every
 * lookup goes through `tagKey`, which folds them to the bare lowercase form
 * the `tag_kinds` table already uses ("cplusplus", "nextjs", "tailwindcss").
 *
 * Kinds uploaded in /admin win. The built-in set below is the fallback, so a
 * technology shows its logo without anyone uploading one. Only technologies
 * (`tech_stack` on posts and projects) get icons; topics stay plain chips.
 *
 * Files live in `public/tag-icons/`. Colour logos are from devicon (MIT) and
 * simple-icons (CC0) with the brand colour filled in. Marks that are black
 * in the original are `mono`: they are drawn in the chip's text colour, so
 * they stay visible in dark mode and on the filled active chip.
 */

export type TagIcon = {
  src: string;
  /** Draw as a silhouette in `currentColor` instead of as an image. */
  mono: boolean;
};

const BUILT_IN: Record<string, { file: string; mono?: true }> = {
  arduino: { file: "arduino" },
  claude: { file: "claude" },
  cplusplus: { file: "cplusplus" },
  expo: { file: "expo", mono: true },
  kx: { file: "kx", mono: true },
  matlab: { file: "matlab" },
  modelcontextprotocol: { file: "mcp", mono: true },
  mdx: { file: "mdx", mono: true },
  nextjs: { file: "nextjs", mono: true },
  nvidia: { file: "nvidia" },
  pixijs: { file: "pixijs" },
  playwright: { file: "playwright" },
  pwa: { file: "pwa" },
  pyodide: { file: "pyodide" },
  python: { file: "python" },
  react: { file: "react" },
  ros: { file: "ros", mono: true },
  shadcnui: { file: "shadcn", mono: true },
  stripe: { file: "stripe" },
  supabase: { file: "supabase" },
  tailwindcss: { file: "tailwindcss" },
  typescript: { file: "typescript" },
  unrealengine: { file: "unrealengine", mono: true },
  vercel: { file: "vercel", mono: true },
  yolo: { file: "yolo", mono: true },
};

/** Other spellings of a technology, by `tagKey`, pointing at its logo. */
const ALIASES: Record<string, string> = {
  cpp: "cplusplus",
  kdb: "kx",
  kdbplus: "kx",
  q: "kx",
  mcp: "modelcontextprotocol",
  next: "nextjs",
  nvidiajetson: "nvidia",
  jetson: "nvidia",
  pixi: "pixijs",
  reactnative: "react",
  shadcn: "shadcnui",
  tailwind: "tailwindcss",
  ts: "typescript",
  unrealengine4: "unrealengine",
  unrealengine5: "unrealengine",
  ue4: "unrealengine",
  ue5: "unrealengine",
  yolov3: "yolo",
  yolov5: "yolo",
  yolov8: "yolo",
};

/** "C++" → "cplusplus", "Next.js" → "nextjs", "Tailwind CSS" → "tailwindcss". */
export function tagKey(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/#/g, "sharp")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * The icon for a tag, or null when it has none. `uploaded` is the kinds map
 * from `getTagIconMap`, keyed by `tagKey`.
 */
export function resolveTagIcon(
  tag: string,
  uploaded?: Record<string, string>,
): TagIcon | null {
  const key = tagKey(tag);
  const canonical = ALIASES[key] ?? key;

  const url = uploaded?.[key] ?? uploaded?.[canonical];
  if (url) return { src: url, mono: false };

  const builtIn = BUILT_IN[canonical];
  if (builtIn) {
    return {
      src: `/tag-icons/${builtIn.file}.svg`,
      mono: builtIn.mono ?? false,
    };
  }
  return null;
}
