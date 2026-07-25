import GithubSlugger from "github-slugger";

export type TocEntry = {
  /** 2 or 3. `#` is the post title, which the page renders itself. */
  depth: 2 | 3;
  text: string;
  id: string;
};

const FENCE = /^\s*(`{3,}|~{3,})/;
const HEADING = /^(#{2,3})\s+(.+?)\s*#*\s*$/;

/**
 * Strip inline markdown so the label matches the text `rehype-slug` sees after
 * the MDX pipeline has run. Order matters: images before links, since an image
 * is a link with a leading `!`.
 */
function plainText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/**
 * Pull an h2/h3 outline out of MDX source.
 *
 * Slugs come from the same `github-slugger` that `rehype-slug` uses, driven by
 * a single instance in document order, so duplicate headings collide into the
 * same `-1`/`-2` suffixes the rendered anchors get. If those ever drift, every
 * TOC link silently stops scrolling, so `tests/unit/toc.test.ts` pins it.
 */
export function extractToc(source: string): TocEntry[] {
  const slugger = new GithubSlugger();
  const entries: TocEntry[] = [];
  let fence: string | null = null;

  for (const line of source.split("\n")) {
    const fenceMatch = line.match(FENCE);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      // Closing fence must use the same character; ``` inside a ~~~ block is
      // literal content, not a delimiter.
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence !== null) continue;

    const match = line.match(HEADING);
    if (!match) continue;

    const text = plainText(match[2]);
    if (!text) continue;

    entries.push({
      depth: match[1].length as 2 | 3,
      text,
      id: slugger.slug(text),
    });
  }

  return entries;
}
