/**
 * Chart primitives shared by the MDX figure components.
 *
 * Deliberately small: `d3-scale` supplies scales and clean tick values,
 * `d3-shape` supplies the path generator, and everything else is plain SVG.
 * There is no charting framework here on purpose, so figures inherit the
 * site's tokens instead of fighting a library's theme.
 *
 * Colour: a single series in `var(--brand)` against a hairline `var(--border)`
 * grid. The palette was validated with the dataviz skill's checker; `--brand`
 * clears the 3:1 contrast floor in light mode, where `--chart-1` does not.
 */

export const PLOT_MARGIN = { top: 16, right: 16, bottom: 34, left: 56 } as const;

/** Cumulative sum, returned as a new array. */
export function cumulative(values: number[]): number[] {
  const out = new Array<number>(values.length);
  let running = 0;
  for (let i = 0; i < values.length; i++) {
    running += values[i];
    out[i] = running;
  }
  return out;
}

export type EquityFigure = {
  kind: "equity";
  title: string;
  caption?: string;
  meta: {
    trades: number;
    pairs: number;
    start: string;
    end: string;
    grossPnl: number;
    turnover: number;
    borrowCost: number;
    breakevenBps: number;
    source?: string;
  };
  fee: {
    unit: string;
    min: number;
    max: number;
    step: number;
    default: number;
    label: string;
  };
  /** Named fee levels from the paper, rendered as slider presets. */
  presets?: { label: string; bps: number }[];
  series: {
    start: string;
    day: number[];
    /**
     * The fee-independent part of each day. Borrow is already netted into
     * this by the builder, so `borrow` is normally absent.
     */
    gross: number[];
    turnover: number[];
    borrow?: number[];
    trades?: number[];
  };
  winRate: { bps: number[]; rate: number[] };
};

/**
 * Categorical series colours, in fixed assignment order.
 *
 * Fixed, never cycled: a series keeps its hue regardless of how many others
 * are drawn, so filtering or reordering never repaints the survivors. There
 * is no fourth slot on purpose — a fourth series folds into a dash variant of
 * an existing hue (as the Watson orders do) or the figure gets split.
 */
export const SERIES_COLORS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
] as const;

/** A point-wise series. `null` y marks a gap, so a series can cover part of x. */
export type LinePoint = { x: number; y: number | null };

export type LineSeries = {
  label: string;
  points: LinePoint[];
  /**
   * Which categorical hue to use. Two series sharing a colorIndex must differ
   * by `dash` — that is the composite encoding for one entity at two orders.
   */
  colorIndex?: number;
  dash?: boolean;
  /** Short label drawn on the curve, since colour alone is not enough. */
  directLabel?: string;
  /** Where along the series to place `directLabel`, 0..1. Default 0.5. */
  labelAt?: number;
};

/** A labelled vertical rule, e.g. where a numeric method gives out. */
export type Annotation = { x: number; label: string; align?: "left" | "right" };

export type LinesFigure = {
  kind: "lines";
  title: string;
  caption?: string;
  meta?: { source?: string };
  x: { label: string; min?: number; max?: number };
  y: {
    label: string;
    /** Log is the point for error curves spanning many decades. */
    scale?: "linear" | "log";
    min?: number;
    max?: number;
    /** `sci` renders 1e-9 style ticks; `plain` renders numbers. */
    format?: "sci" | "plain";
  };
  series: LineSeries[];
  annotations?: Annotation[];
  /** Horizontal reference levels, e.g. the optimal entry/exit bands. */
  levels?: { value: number; label: string }[];
  /** Called-out points on the series, e.g. where a trade opened and closed. */
  markers?: { x: number; y: number; label: string }[];
};

export type BarFigure = {
  kind: "bar";
  title: string;
  caption?: string;
  meta?: { source?: string };
  /**
   * How to render values. Defaults to `usd` because most figures here are
   * PnL, but a Sharpe ratio labelled "$10" is simply wrong.
   */
  valueFormat?: "usd" | "number";
  x: { label: string; values: string[] };
  series: { label: string; values: number[] }[];
  trades?: number[];
};

export type Figure = EquityFigure | BarFigure | LinesFigure;

/**
 * Cumulative net PnL at an arbitrary fee.
 *
 * Net is linear in the fee (`net = gross - fee * turnover - borrow`), so this
 * is exact at any slider position rather than an interpolation between
 * precomputed curves. That is the whole reason the payload ships turnover
 * per day instead of a set of baked equity lines.
 */
export function netCurve(series: EquityFigure["series"], feeBps: number): number[] {
  const rate = feeBps / 10_000;
  return cumulative(
    series.gross.map(
      (g, i) => g - series.turnover[i] * rate - (series.borrow?.[i] ?? 0),
    ),
  );
}

/** Total net PnL at a fee, without allocating the whole curve. */
export function netTotal(series: EquityFigure["series"], feeBps: number): number {
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
export function winRateAt(grid: EquityFigure["winRate"], feeBps: number): number {
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

/** Day offset back to a real date, for axis labels and tooltips. */
export function dayToDate(start: string, day: number): Date {
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + day);
  return date;
}

export function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export function formatDay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
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

/** Value formatters for bar figures, selected by `BarFigure.valueFormat`. */
export const BAR_FORMATS = {
  usd: { full: formatUsd, axis: formatUsdCompact },
  number: {
    full: (v: number) => formatNumber(v, 2),
    axis: (v: number) => formatNumber(v, 1),
  },
} as const;
