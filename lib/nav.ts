export type NavItem = {
  label: string;
  href: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Projects", href: "/projects" },
  { label: "Blog", href: "/blog" },
  { label: "Research", href: "/research" },
  { label: "About", href: "/about" },
];

export type Crumb = {
  /** The segment as shown, decoded: `quant`, not `quant%20research`. */
  label: string;
  /** Where the segment leads, or null when it has no page of its own. */
  href: string | null;
};

/**
 * URL segments that exist only as a prefix. `/blog/tag/quant` is a page and
 * `/blog/tag` is not, so its crumb is shown but is not a link.
 */
const NOT_A_PAGE = new Set(["/blog/tag"]);

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    // A malformed escape (`%E0%A4%A`) reaches the 404 page as typed.
    return segment;
  }
}

/** The path as breadcrumb segments, root excluded. `/` is an empty list. */
export function breadcrumb(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, i) => {
    const href = `/${segments.slice(0, i + 1).join("/")}`;
    return { label: decode(segment), href: NOT_A_PAGE.has(href) ? null : href };
  });
}

/**
 * How many leading segments two paths share. Going from `/blog` to
 * `/blog/some-post` keeps `blog` on screen and types only the new part.
 */
export function sharedSegments(a: string, b: string): number {
  const left = a.split("/").filter(Boolean);
  const right = b.split("/").filter(Boolean);
  let n = 0;
  while (n < left.length && n < right.length && left[n] === right[n]) n++;
  return n;
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return row[b.length];
}

/**
 * The section a mistyped path most likely meant, for the 404's "did you mean".
 *
 * A path under a real section (`/blog/no-such-post`) points back at that
 * section. Otherwise the first segment has to be within two edits of a section
 * name (`/blgo`, `/reserch`), which is close enough to be a typo and far
 * enough from everything else that `/pricing` suggests nothing.
 */
export function nearestSection(pathname: string): NavItem | null {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase();
  if (!first) return null;

  const exact = NAV_ITEMS.find((item) => item.href === `/${first}`);
  if (exact) return segments.length > 1 ? exact : null;

  let best: NavItem | null = null;
  let bestDistance = 3;
  for (const item of NAV_ITEMS) {
    const distance = editDistance(first, item.href.slice(1));
    if (distance < bestDistance) {
      best = item;
      bestDistance = distance;
    }
  }
  return best;
}
