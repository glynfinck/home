/**
 * Vega expression fragments for axis labels.
 *
 * These exist because d3's format strings get the sign in the wrong place for
 * money: `"$~s"` renders `$-1.5k` where the site renders `-$1.5k`. Rather than
 * accept a different convention inside figures than in the prose around them,
 * axis labels are built from expressions that match the formatters in
 * `lib/chart.ts`.
 *
 * Exported so the admin chart editor can offer them as one-click snippets
 * instead of asking anyone to retype them.
 */

/** `-$1.5k`, `$2k`, `$0`. Mirrors `formatUsdCompact`. */
export const USD_COMPACT_EXPR =
  "(datum.value < 0 ? '-$' : '$') + " +
  "(abs(datum.value) >= 1000 " +
  "? (abs(datum.value) % 1000 == 0 " +
  "? format(abs(datum.value) / 1000, 'd') " +
  ": format(abs(datum.value) / 1000, '.1f')) + 'k' " +
  ": format(abs(datum.value), 'd'))";

/** `1e-13`, for log axes spanning many decades. Mirrors `formatSci`. */
export const SCI_EXPR = "'1e' + format(round(log(datum.value) / LN10), 'd')";

/** `0.2`, `-1.1`. Mirrors `formatNumber` with one decimal. */
export const NUMBER_EXPR = "format(datum.value, '.1~f')";

export const LABEL_EXPRESSIONS = {
  "usd-compact": USD_COMPACT_EXPR,
  sci: SCI_EXPR,
  plain: NUMBER_EXPR,
} as const;
