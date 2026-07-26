/**
 * The numbers a figure states in prose, and the formatters that render them.
 *
 * Drawing is Vega's job. What lives here is everything that appears as text
 * beside a plot: the read-out under an interactive figure, the accessible data
 * table, and the axis label expressions in `lib/charts/expr.ts`. They share
 * these formatters so a figure and the sentence next to it cannot disagree
 * about what a dollar or a basis point looks like.
 */

/**
 * The columns the fee identity needs. Structural rather than tied to any
 * payload shape, so it is satisfied by a few columns lifted out of a dataset.
 */
export type FeeSeries = {
  gross: number[];
  turnover: number[];
  borrow?: number[];
};

/**
 * Total net PnL at a fee.
 *
 * Net is linear in the fee (`net = gross - fee * turnover - borrow`), which is
 * why the figure can be re-priced at any cost assumption exactly rather than
 * interpolated between baked curves. The chart spec states the same identity
 * as a Vega-Lite transform; this is the copy the read-out uses.
 */
export function netTotal(series: FeeSeries, feeBps: number): number {
  const rate = feeBps / 10_000;
  let total = 0;
  for (let i = 0; i < series.gross.length; i++) {
    total +=
      series.gross[i] - series.turnover[i] * rate - (series.borrow?.[i] ?? 0);
  }
  return total;
}

/**
 * Win rate at a fee, from the precomputed grid.
 *
 * Unlike net PnL this is not linear in the fee, so it cannot be derived from
 * the daily buckets. The grid is dense (0.25 bps), so nearest-neighbour is
 * within rounding of the exact value and avoids implying false precision.
 */
export function winRateAt(
  grid: { bps: number[]; rate: number[] },
  feeBps: number,
): number {
  if (grid.bps.length === 0) return 0;
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < grid.bps.length; i++) {
    const distance = Math.abs(grid.bps[i] - feeBps);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return grid.rate[best];
}

/** `$1,896` / `-$1,804`. Whole dollars: cents are noise at this magnitude. */
export function formatUsd(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}$${Math.abs(rounded).toLocaleString("en-US")}`;
}

/** Axis ticks want `$2k` rather than `$2,000` to keep the gutter narrow. */
export function formatUsdCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1000) {
    const k = abs / 1000;
    return `${sign}$${k % 1 === 0 ? k : k.toFixed(1)}k`;
  }
  return `${sign}$${Math.round(abs)}`;
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/**
 * `2 bps`, `2.25 bps`, `14.3 bps`.
 *
 * Two decimals is the most the 0.25 slider step can produce, and trailing
 * zeros are stripped so a break-even of 14.3 doesn't read as `14.30`.
 */
export function formatBps(value: number): string {
  return `${Number(value.toFixed(2))} bps`;
}

/** `1e-9`, for log axes spanning many decades. */
export function formatSci(value: number): string {
  if (value === 0) return "0";
  const exponent = Math.round(Math.log10(Math.abs(value)));
  return `1e${exponent}`;
}

/** Compact plain number for axis ticks: `1.4`, `-1.1`, `10.2`. */
export function formatNumber(value: number, digits = 1): string {
  return Number(value.toFixed(digits)).toString();
}
