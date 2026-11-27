import { z } from "zod";

/**
 * A paper's headline numbers: the three or four figures it leads with on its
 * card and at the top of its page (`research_papers.highlights`).
 */
export const highlightSchema = z.object({
  label: z.string().trim().min(1, "A highlight needs a label").max(28),
  // A formatted figure, as it should read: "14.3 bps", "-$1,496".
  value: z.string().trim().min(1, "A highlight needs a value").max(16),
  // `negative` marks the number that went against the hypothesis; it is drawn
  // in amber so the losing result is the one the eye lands on.
  tone: z.enum(["neutral", "negative"]).default("neutral"),
});
export type Highlight = z.infer<typeof highlightSchema>;

export const MAX_HIGHLIGHTS = 4;
export const highlightsSchema = z.array(highlightSchema).max(MAX_HIGHLIGHTS);

/**
 * Read the column defensively. It is JSON, so nothing at the database level
 * guarantees its shape, and a page rendered between a deploy and its migration
 * sees no column at all. Either way the answer is "no highlights", not an
 * error on a public page.
 */
export function parseHighlights(value: unknown): Highlight[] {
  const parsed = highlightsSchema.safeParse(value ?? []);
  return parsed.success ? parsed.data : [];
}
