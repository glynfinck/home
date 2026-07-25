"use client";

import { useRef, useState } from "react";
import { scaleLinear } from "d3-scale";

import { useChartSize } from "@/components/site/mdx/chart/use-chart-size";
import { ChartFrame, DataTable } from "@/components/site/mdx/chart/chart-frame";
import { PLOT_MARGIN, formatUsd, formatUsdCompact, type BarFigure } from "@/lib/chart";

/**
 * Single-series column chart with a zero baseline.
 *
 * Deliberately one series. The payload also carries a net-of-fees figure, but
 * plotting both would need a second categorical hue, and the site's tokens
 * define exactly one accent against a neutral ramp; a grey second series fails
 * the chroma floor. The comparison lives in the tooltip and the data table
 * instead, which is where the dataviz rules want secondary values anyway.
 *
 * Bars below the baseline carry the same colour as bars above it. Direction
 * encodes sign; recolouring by sign would be a second encoding of information
 * the geometry already shows.
 */
export function BarChart({ figure }: { figure: BarFigure }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useChartSize(containerRef);

  const primary = figure.series[0];
  const secondary = figure.series[1];
  const labels = figure.x.values;

  const innerWidth = Math.max(width - PLOT_MARGIN.left - PLOT_MARGIN.right, 10);
  const innerHeight = Math.max(
    height - PLOT_MARGIN.top - PLOT_MARGIN.bottom,
    10,
  );

  const y = scaleLinear()
    .domain([
      Math.min(0, ...primary.values),
      Math.max(0, ...primary.values),
    ])
    .nice(5)
    .range([PLOT_MARGIN.top + innerHeight, PLOT_MARGIN.top]);

  const band = innerWidth / labels.length;
  // Cap the bar and let the leftover band be air, never a full-width block.
  const barWidth = Math.min(band - 8, 24);
  const yTicks = y.ticks(5);
  const zero = y(0);

  // Thin the x labels only as far as the width actually demands, and always
  // keep the first and last. Dropping the final category is not a cosmetic
  // loss here: the tail is what the figure is arguing about.
  const maxLabels = Math.max(2, Math.floor(innerWidth / 72));
  const labelStep = Math.max(1, Math.ceil(labels.length / maxLabels));
  const showLabel = (i: number) =>
    i === 0 || i === labels.length - 1 || i % labelStep === 0;

  return (
    <ChartFrame
      title={figure.title}
      caption={figure.caption}
      source={figure.meta?.source}
      table={
        <DataTable
          columns={[
            figure.x.label,
            primary.label,
            ...(secondary ? [secondary.label] : []),
            ...(figure.trades ? ["Trades"] : []),
          ]}
          rows={labels.map((label, i) => [
            label,
            formatUsd(primary.values[i]),
            ...(secondary ? [formatUsd(secondary.values[i])] : []),
            ...(figure.trades ? [figure.trades[i].toLocaleString("en-US")] : []),
          ])}
        />
      }
    >
      <div ref={containerRef} className="relative w-full">
        <svg
          width={width}
          height={height}
          // See the note in equity-chart.tsx: without a viewBox, `height: auto`
          // clips the x-axis band instead of scaling it.
          viewBox={`0 0 ${width} ${height}`}
          style={{ maxWidth: "100%", height: "auto" }}
          role="img"
          aria-label={`${figure.title}. ${labels
            .map((label, i) => `${label}: ${formatUsd(primary.values[i])}`)
            .join(". ")}.`}
          className="outline-none"
        >
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

          <line
            x1={PLOT_MARGIN.left}
            x2={PLOT_MARGIN.left + innerWidth}
            y1={zero}
            y2={zero}
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
            >
              {formatUsdCompact(tick)}
            </text>
          ))}

          {labels.map((label, i) => {
            const value = primary.values[i];
            const center = PLOT_MARGIN.left + band * i + band / 2;
            const top = Math.min(y(value), zero);
            const barHeight = Math.abs(y(value) - zero);
            const focused = hoverIndex === i;

            return (
              <g key={label}>
                {/* Hit target spans the whole band so the pointer only has to
                    be closest, not on the painted pixels. */}
                <rect
                  x={PLOT_MARGIN.left + band * i}
                  y={PLOT_MARGIN.top}
                  width={band}
                  height={innerHeight}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${label}: ${formatUsd(value)}`}
                  onPointerEnter={() => setHoverIndex(i)}
                  onPointerLeave={() => setHoverIndex(null)}
                  onFocus={() => setHoverIndex(i)}
                  onBlur={() => setHoverIndex(null)}
                  className="cursor-default outline-none"
                />
                <rect
                  x={center - barWidth / 2}
                  y={top}
                  width={barWidth}
                  height={Math.max(barHeight, 1)}
                  // Rounded data-end, square at the baseline. Negative bars
                  // grow downward, so the rounded end is the bottom.
                  rx={3}
                  fill="var(--brand)"
                  opacity={focused ? 1 : 0.85}
                  pointerEvents="none"
                />
                {/* Square off the baseline end by overpainting the rounding. */}
                <rect
                  x={center - barWidth / 2}
                  y={value >= 0 ? zero - 3 : zero}
                  width={barWidth}
                  height={3}
                  fill="var(--brand)"
                  opacity={focused ? 1 : 0.85}
                  pointerEvents="none"
                />
                {showLabel(i) ? (
                  <text
                    x={center}
                    y={height - 12}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--muted-foreground)"
                    pointerEvents="none"
                  >
                    {label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {hoverIndex !== null ? (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded-md border border-border/60 bg-popover/95 px-3 py-2 text-xs shadow-sm backdrop-blur"
            style={
              PLOT_MARGIN.left + band * hoverIndex > width - 170
                ? { right: 8 }
                : { left: PLOT_MARGIN.left + band * hoverIndex + band }
            }
          >
            <p className="font-mono text-sm font-medium tabular-nums text-foreground">
              {formatUsd(primary.values[hoverIndex])}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {figure.x.label}: {labels[hoverIndex]}
            </p>
            {secondary ? (
              <p className="text-muted-foreground/80">
                {secondary.label}: {formatUsd(secondary.values[hoverIndex])}
              </p>
            ) : null}
            {figure.trades ? (
              <p className="text-muted-foreground/80">
                {figure.trades[hoverIndex].toLocaleString("en-US")} trades
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="mt-1 text-center text-xs text-muted-foreground">
          {figure.x.label}
        </p>
      </div>
    </ChartFrame>
  );
}
