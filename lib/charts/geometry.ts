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

/** Two rendered widths, chosen by CSS. See `ChartFigure`. */
export const BREAKPOINTS = {
  narrow: {
    width: 360,
    height: 260,
    padding: { left: 44, top: 12, right: 10, bottom: 32 },
  },
  wide: {
    width: 720,
    height: 314,
    padding: { left: 56, top: 16, right: 16, bottom: 34 },
  },
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;
