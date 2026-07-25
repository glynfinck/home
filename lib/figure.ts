import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";

import type { Figure } from "@/lib/chart";

/**
 * Load a figure payload for an MDX chart.
 *
 * Two sources, because authoring and shipping have different needs:
 *
 * - A root-relative path (`/figures/pairs-equity.json`) is read straight off
 *   disk from `public/`. No HTTP round trip, no absolute-URL plumbing, and it
 *   works identically at build time and request time.
 * - An absolute URL is fetched, which is how a JSON uploaded through
 *   `/admin/media` to the Supabase `media` bucket gets referenced without a
 *   redeploy.
 *
 * Returns `null` rather than throwing: a broken figure reference should leave
 * a visible placeholder in one article, not fail the whole page render. This
 * mirrors the fail-soft `safeRead` posture in `lib/data/util.ts`.
 */
export async function loadFigure(src: string): Promise<Figure | null> {
  try {
    if (/^https?:\/\//i.test(src)) {
      const response = await fetch(src, { next: { revalidate: 3600 } });
      if (!response.ok) return null;
      return (await response.json()) as Figure;
    }

    if (!src.startsWith("/")) return null;

    // `normalize` collapses any `..` segments before the prefix check, so a
    // crafted src cannot escape `public/`.
    const publicDir = join(process.cwd(), "public");
    const target = normalize(join(publicDir, src));
    if (!target.startsWith(publicDir)) return null;

    return JSON.parse(await readFile(target, "utf8")) as Figure;
  } catch {
    return null;
  }
}
