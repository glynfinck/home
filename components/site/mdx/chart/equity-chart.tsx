"use client";

import { useMemo, useRef, useState } from "react";
import { scaleLinear } from "d3-scale";
import { line as d3Line } from "d3-shape";

import {
  DEFAULT_CHART_WIDTH,
  useChartSize,
} from "@/components/site/mdx/chart/use-chart-size";
import { ChartFrame, DataTable } from "@/components/site/mdx/chart/chart-frame";
import {
  PLOT_MARGIN,
  dayToDate,
  formatBps,
  formatDay,
  formatMonth,
  formatPercent,
  formatUsd,
  formatUsdCompact,
  netCurve,
  netTotal,
  winRateAt,
  type EquityFigure,
} from "@/lib/chart";

/**
 * Cumulative net PnL with a fee slider.
 *
 * The argument this figure makes is that the strategy's edge is real but sits
 * below realistic trading costs, so the reader is handed the cost assumption
 * rather than shown three pre-baked curves. Net PnL is linear in the fee, so
 * every position of the slider is exact, not interpolated.
 *
 * The y domain is fixed across the whole fee range instead of refitting per
 * frame. A refitting axis would keep the curve looking identical at every fee
 * and hide the very thing the reader is being asked to look at.
 */
export function EquityChart({ figure }: { figure: EquityFigure }) {
  const [feeBps, setFeeBps] = useState(figure.fee.default);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useChartSize(containerRef);

  const { series, meta, fee } = figure;

  const curve = useMemo(() => netCurve(series, feeBps), [series, feeBps]);

  // Extremes across the full slider range, so the axis never moves.
  const yDomain = useMemo(() => {
    const low = netCurve(series, fee.max);
    const high = netCurve(series, fee.min);
    return [
      Math.min(0, ...low, ...high),
      Math.max(0, ...low, ...high),
    ] as const;
  }, [series, fee.min, fee.max]);

  const innerWidth = Math.max(width - PLOT_MARGIN.left - PLOT_MARGIN.right, 10);
  const innerHeight = Math.max(
    height - PLOT_MARGIN.top - PLOT_MARGIN.bottom,
    10,
  );

  const x = scaleLinear()
    .domain([series.day[0], series.day[series.day.length - 1]])
    .range([PLOT_MARGIN.left, PLOT_MARGIN.left + innerWidth]);

  const y = scaleLinear()
    .domain([yDomain[0], yDomain[1]])
    .nice(5)
    .range([PLOT_MARGIN.top + innerHeight, PLOT_MARGIN.top]);

  const path =
    d3Line<number>()
      .x((_, i) => x(series.day[i]))
      .y((value) => y(value))(curve) ?? "";

  const total = netTotal(series, feeBps);
  const winRate = winRateAt(figure.winRate, feeBps);
  const underwater = total < 0;

  const yTicks = y.ticks(5);
  const xTicks = x.ticks(Math.max(2, Math.floor(innerWidth / 90)));

  const lastIndex = curve.length - 1;
  const active = hoverIndex ?? null;

  function pointerToIndex(clientX: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const day = x.invert(clientX - rect.left);
    // Nearest day by value, not by array position: buckets skip empty days.
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < series.day.length; i++) {
      const distance = Math.abs(series.day[i] - day);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    return best;
  }

  return (
    <ChartFrame
      title={figure.title}
      caption={figure.caption}
      source={meta.source}
      readout={
        <Readout
          total={total}
          winRate={winRate}
          feeBps={feeBps}
          breakevenBps={meta.breakevenBps}
          underwater={underwater}
        />
      }
      controls={
        <FeeSlider
          fee={fee}
          value={feeBps}
          onChange={setFeeBps}
          presets={figure.presets}
        />
      }
      table={
        <DataTable
          columns={["Fee", "Net PnL", "Win rate"]}
          rows={FEE_TABLE_ROWS.filter((bps) => bps <= fee.max).map((bps) => [
            formatBps(bps),
            formatUsd(netTotal(series, bps)),
            formatPercent(winRateAt(figure.winRate, bps)),
          ])}
        />
      }
    >
      <div ref={containerRef} className="relative w-full">
        <svg
          width={width}
          height={height}
          // The viewBox is what makes `height: auto` scale the *content*.
          // Without it the box shrinks to fit but the geometry keeps its
          // intrinsic coordinates, and the x-axis labels get clipped off the
          // bottom — which is exactly what a no-JS reader would see, since
          // they never get the measured width.
          viewBox={`0 0 ${width} ${height}`}
          style={{ maxWidth: "100%", height: "auto" }}
          role="img"
          aria-label={`Cumulative net profit and loss across ${meta.trades.toLocaleString("en-US")} trades from ${meta.start} to ${meta.end}. At ${formatBps(feeBps)} per side the strategy ends at ${formatUsd(total)}. It breaks even at ${formatBps(meta.breakevenBps)}.`}
          tabIndex={0}
          onPointerMove={(event) => setHoverIndex(pointerToIndex(event.clientX))}
          onPointerLeave={() => setHoverIndex(null)}
          onFocus={() => setHoverIndex((prev) => prev ?? lastIndex)}
          onBlur={() => setHoverIndex(null)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            setHoverIndex((prev) => {
              const base = prev ?? lastIndex;
              const step = event.key === "ArrowLeft" ? -1 : 1;
              return Math.min(Math.max(base + step, 0), lastIndex);
            });
          }}
          className="touch-pan-y rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        >
          {/* Recessive hairline grid, solid never dashed. */}
          {yTicks.map((tick) => (
            <line
              key={tick}
              x1={PLOT_MARGIN.left}
              x2={PLOT_MARGIN.left + innerWidth}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--border)"
              strokeWidth={1}
            />
          ))}

          {/* Zero rule: the line the whole figure is about. */}
          <line
            x1={PLOT_MARGIN.left}
            x2={PLOT_MARGIN.left + innerWidth}
            y1={y(0)}
            y2={y(0)}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            opacity={0.55}
          />

          {yTicks.map((tick) => (
            <text
              key={`label-${tick}`}
              x={PLOT_MARGIN.left - 10}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={11}
              fill="var(--muted-foreground)"
              className="tabular-nums"
            >
              {formatUsdCompact(tick)}
            </text>
          ))}

          {xTicks.map((tick) => (
            <text
              key={`x-${tick}`}
              x={x(tick)}
              y={height - 12}
              textAnchor="middle"
              fontSize={11}
              fill="var(--muted-foreground)"
            >
              {formatMonth(dayToDate(series.start, tick))}
            </text>
          ))}

          <path
            d={path}
            fill="none"
            stroke="var(--brand)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {active !== null ? (
            <>
              <line
                x1={x(series.day[active])}
                x2={x(series.day[active])}
                y1={PLOT_MARGIN.top}
                y2={PLOT_MARGIN.top + innerHeight}
                stroke="var(--muted-foreground)"
                strokeWidth={1}
                opacity={0.5}
              />
              {/* 2px surface ring keeps the dot legible over the line. */}
              <circle
                cx={x(series.day[active])}
                cy={y(curve[active])}
                r={5}
                fill="var(--brand)"
                stroke="var(--card)"
                strokeWidth={2}
              />
            </>
          ) : (
            <circle
              cx={x(series.day[lastIndex])}
              cy={y(curve[lastIndex])}
              r={4}
              fill="var(--brand)"
              stroke="var(--card)"
              strokeWidth={2}
            />
          )}
        </svg>

        {active !== null ? (
          <Tooltip
            x={x(series.day[active])}
            width={width}
            date={formatDay(dayToDate(series.start, series.day[active]))}
            value={formatUsd(curve[active])}
            trades={series.trades?.[active]}
          />
        ) : null}
      </div>
    </ChartFrame>
  );
}

// Includes the paper's three tiers (2 / 14 maker / 24 taker).
const FEE_TABLE_ROWS = [0, 2, 5, 10, 14, 20, 24, 30];

function Readout({
  total,
  winRate,
  feeBps,
  breakevenBps,
  underwater,
}: {
  total: number;
  winRate: number;
  feeBps: number;
  breakevenBps: number;
  underwater: boolean;
}) {
  return (
    <dl
      // The numbers are the point of the slider, so announce them as they move.
      aria-live="polite"
      aria-atomic="true"
      className="flex flex-wrap items-baseline gap-x-6 gap-y-2 pt-3 font-mono text-sm"
    >
      <div className="flex items-baseline gap-2">
        <dt className="text-xs text-muted-foreground">net</dt>
        <dd
          className={
            underwater
              ? "text-base font-medium tabular-nums text-muted-foreground line-through decoration-1"
              : "text-base font-medium tabular-nums text-foreground"
          }
        >
          {formatUsd(total)}
        </dd>
      </div>
      <div className="flex items-baseline gap-2">
        <dt className="text-xs text-muted-foreground">win</dt>
        <dd className="tabular-nums text-foreground">
          {formatPercent(winRate)}
        </dd>
      </div>
      <div className="flex items-baseline gap-2">
        <dt className="text-xs text-muted-foreground">break-even</dt>
        <dd className="tabular-nums text-foreground">
          {formatBps(breakevenBps)}
        </dd>
      </div>
      {underwater ? (
        <p className="w-full text-xs text-muted-foreground">
          At {formatBps(feeBps)} the edge is gone.
        </p>
      ) : null}
    </dl>
  );
}

function FeeSlider({
  fee,
  value,
  onChange,
  presets = [],
}: {
  fee: EquityFigure["fee"];
  value: number;
  onChange: (next: number) => void;
  /**
   * Named fee tiers, supplied by the payload rather than hardcoded here, so
   * the buttons cannot drift from the levels the paper actually reports.
   */
  presets?: { label: string; bps: number }[];
}) {
  const inRange = presets.filter(
    (preset) => preset.bps >= fee.min && preset.bps <= fee.max,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <label
          htmlFor="fee-slider"
          className="font-mono text-xs tracking-widest text-brand uppercase"
        >
          {fee.label}
        </label>
        <output
          htmlFor="fee-slider"
          className="font-mono text-sm tabular-nums text-foreground"
        >
          {formatBps(value)}
        </output>
      </div>

      <input
        id="fee-slider"
        type="range"
        min={fee.min}
        max={fee.max}
        step={fee.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="fee-slider w-full"
      />

      <div className="flex flex-wrap gap-2">
        {inRange.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange(preset.bps)}
            aria-pressed={Math.abs(preset.bps - value) < fee.step / 2}
            className="rounded-md border border-border/60 px-2 py-1 font-mono text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground aria-pressed:border-brand/60 aria-pressed:text-brand"
          >
            {preset.label} · {formatBps(preset.bps)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Tooltip({
  x,
  width,
  date,
  value,
  trades,
}: {
  x: number;
  width: number;
  date: string;
  value: string;
  trades?: number;
}) {
  // Flip to the left of the crosshair near the right edge so the card never
  // spills out of the figure.
  const flip = x > width - 150;

  return (
    <div
      className="pointer-events-none absolute top-2 z-10 rounded-md border border-border/60 bg-popover/95 px-3 py-2 text-xs shadow-sm backdrop-blur"
      style={
        flip
          ? { right: Math.max(width - x + 8, 8) }
          : { left: Math.min(x + 8, width - 8) }
      }
    >
      <p className="font-mono text-sm font-medium tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-0.5 text-muted-foreground">{date}</p>
      {trades !== undefined ? (
        <p className="text-muted-foreground/80">
          {trades} {trades === 1 ? "trade" : "trades"}
        </p>
      ) : null}
    </div>
  );
}

export { DEFAULT_CHART_WIDTH };
