/**
 * Figure geometry, kept apart from the renderer.
 *
 * `lib/charts/render.ts` is `server-only` and pulls in vega — several megabytes
 * that must never be reachable from a component tree. The loading fallbacks
 * need nothing from it but these numbers, and a placeholder that guesses the
 * height instead of importing it is how a figure ends up shifting the page when
 * it arrives. So the constants live here, with no dependencies, and the
 * renderer re-exports them.
 */

/**
 * Two rendered widths, chosen by CSS. See `ChartFigure`.
 *
 * `padding.bottom` has to hold a row of tick labels *and* an x-axis title:
 * 6px label padding, an 11px label, a gap, an 11px title and a 2px margin.
 * At 32/34 the title's top edge landed on the labels' bottom edge, so the two
 * rows touched and, on the narrow figure, overlapped.
 */
export const BREAKPOINTS = {
  narrow: {
    width: 360,
    height: 260,
    padding: { left: 44, top: 12, right: 10, bottom: 40 },
  },
  wide: {
    width: 720,
    height: 314,
    padding: { left: 56, top: 16, right: 16, bottom: 40 },
  },
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;
