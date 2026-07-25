"use client";

import { useRef, useState } from "react";
import { scaleLinear, scaleLog } from "d3-scale";
import { line as d3Line } from "d3-shape";

import { useChartSize } from "@/components/site/mdx/chart/use-chart-size";
import { ChartFrame, DataTable } from "@/components/site/mdx/chart/chart-frame";
import {
  PLOT_MARGIN,
  SERIES_COLORS,
  formatNumber,
  formatSci,
  type LinePoint,
  type LineSeries,
  type LinesFigure,
} from "@/lib/chart";

/**
 * Multi-series line chart with an optional log y-axis.
 *
 * Built for the validation figure in the pairs post, where four curves live on
 * different parts of the x domain and the interesting quantity spans twelve
 * decades. Three things follow from that:
 *
 * - Series carry their own points rather than sharing one x array, so a curve
 *   defined only for x >= 8 simply has no points below it. A `null` y is a gap.
 * - Log scale is a real option, not a transform applied to the data, so the
 *   ticks are decades and the tooltip shows true values.
 * - Every series is direct-labelled. This is required, not decorative: the
 *   light-mode palette's amber/emerald pair sits in the 6-8 CVD band, which is
 *   only legal with a secondary encoding. Colour alone would not be readable.
 */
export function LineChart({ figure }: { figure: LinesFigure }) {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useChartSize(containerRef);

  const {
    series,
    x: xConf,
    y: yConf,
    annotations = [],
    levels = [],
    markers = [],
  } = figure;
  const isLog = yConf.scale === "log";

  const allPoints = series.flatMap((s) => s.points);
  const defined = allPoints.filter(
    (p): p is { x: number; y: number } => p.y !== null,
  );

  const xMin = xConf.min ?? Math.min(...allPoints.map((p) => p.x));
  const xMax = xConf.max ?? Math.max(...allPoints.map((p) => p.x));
  // Levels and markers participate in the domain: a d* line drawn outside the
  // plot would silently vanish, which is worse than a slightly looser axis.
  const yCandidates = [
    ...defined.map((p) => p.y),
    ...levels.map((l) => l.value),
    ...markers.map((m) => m.y),
  ];
  const yMin = yConf.min ?? Math.min(...yCandidates);
  const yMax = yConf.max ?? Math.max(...yCandidates);

  // Room on the right for the direct labels the palette obliges us to draw.
  const rightMargin = Math.max(PLOT_MARGIN.right, 12);
  const innerWidth = Math.max(width - PLOT_MARGIN.left - rightMargin, 10);
  const innerHeight = Math.max(
    height - PLOT_MARGIN.top - PLOT_MARGIN.bottom,
    10,
  );

  const xScale = scaleLinear()
    .domain([xMin, xMax])
    .range([PLOT_MARGIN.left, PLOT_MARGIN.left + innerWidth]);

  const yScale = isLog
    ? scaleLog()
        .domain([yMin, yMax])
        .range([PLOT_MARGIN.top + innerHeight, PLOT_MARGIN.top])
    : scaleLinear()
        .domain([yMin, yMax])
        .nice(5)
        .range([PLOT_MARGIN.top + innerHeight, PLOT_MARGIN.top]);

  const path = d3Line<LinePoint>()
    .defined((p) => p.y !== null)
    .x((p) => xScale(p.x))
    .y((p) => yScale(p.y as number));

  // Log ticks get thinned to whole decades; a log axis labelled every minor
  // tick is unreadable at this height.
  const yTicks = isLog
    ? yScale
        .ticks()
        .filter((t) => Math.abs(Math.log10(t) - Math.round(Math.log10(t))) < 1e-9)
        .filter((_, i, arr) => arr.length <= 8 || i % 2 === 0)
    : (yScale as ReturnType<typeof scaleLinear<number, number>>).ticks(5);

  const xTicks = xScale.ticks(Math.max(3, Math.floor(innerWidth / 80)));
  const formatY = yConf.format === "sci" || isLog ? formatSci : formatNumber;

  function pointerToX(clientX: number): number | null {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const value = xScale.invert(clientX - rect.left);
    return Math.min(Math.max(value, xMin), xMax);
  }

  // One readout listing every series at the hovered x, so the pointer never
  // has to land on a 2px line to get a value.
  const readings =
    hoverX === null
      ? []
      : series.map((s) => ({ series: s, point: nearestPoint(s, hoverX) }));

  return (
    <ChartFrame
      title={figure.title}
      caption={figure.caption}
      source={figure.meta?.source}
      legend={
        // One series needs no legend box — the title says what is plotted, and
        // a lone swatch just restates it. Multi-series always gets one.
        series.length > 1 ? (
          <Legend
            series={series}
            activeX={hoverX}
            formatY={formatY}
            readings={readings}
          />
        ) : undefined
      }
      table={
        <DataTable
          columns={[xConf.label, ...series.map((s) => s.label)]}
          rows={tableRows(figure, formatY)}
        />
      }
    >
      <div ref={containerRef} className="relative w-full">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ maxWidth: "100%", height: "auto" }}
          role="img"
          aria-label={ariaSummary(figure)}
          onPointerMove={(e) => setHoverX(pointerToX(e.clientX))}
          onPointerLeave={() => setHoverX(null)}
          className="touch-pan-y"
        >
          {yTicks.map((tick) => (
            <line
              key={`grid-${tick}`}
              x1={PLOT_MARGIN.left}
              x2={PLOT_MARGIN.left + innerWidth}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="var(--border)"
              strokeWidth={1}
            />
          ))}

          {yTicks.map((tick) => (
            <text
              key={`ylab-${tick}`}
              x={PLOT_MARGIN.left - 8}
              y={yScale(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fill="var(--muted-foreground)"
            >
              {formatY(tick)}
            </text>
          ))}

          {xTicks.map((tick) => (
            <text
              key={`xlab-${tick}`}
              x={xScale(tick)}
              y={height - 16}
              textAnchor="middle"
              fontSize={10}
              fill="var(--muted-foreground)"
            >
              {formatNumber(tick, 0)}
            </text>
          ))}

          {/* Annotations sit under the data: they are context, not content. */}
          {annotations.map((a) => (
            <g key={a.label}>
              <line
                x1={xScale(a.x)}
                x2={xScale(a.x)}
                y1={PLOT_MARGIN.top}
                y2={PLOT_MARGIN.top + innerHeight}
                stroke="var(--muted-foreground)"
                strokeWidth={1}
                opacity={0.45}
              />
              {(() => {
                // Honour `align` where there is room, but flip rather than let
                // the label run off the plot: a threshold marker that reads
                // "pbdv overflo" is worse than one on the other side.
                const px = xScale(a.x);
                const right = PLOT_MARGIN.left + innerWidth;
                const anchor =
                  px > right - 80 ? "end" : a.align === "right" ? "end" : "start";
                return (
                  <text
                    x={px + (anchor === "end" ? -6 : 6)}
                    y={PLOT_MARGIN.top + 10}
                    textAnchor={anchor}
                    fontSize={10}
                    fill="var(--muted-foreground)"
                  >
                    {a.label}
                  </text>
                );
              })()}
            </g>
          ))}

          {/* Horizontal reference levels, dashed to read as thresholds rather
              than as another data series. Rules go under the data; their
              labels are drawn after it, below. */}
          {levels.map((level) => (
            <line
              key={level.label}
              x1={PLOT_MARGIN.left}
              x2={PLOT_MARGIN.left + innerWidth}
              y1={yScale(level.value)}
              y2={yScale(level.value)}
              stroke="var(--muted-foreground)"
              strokeWidth={1}
              strokeDasharray="5 3"
              opacity={0.6}
            />
          ))}

          {series.map((s, i) => (
            <path
              key={s.label}
              d={path(s.points) ?? ""}
              fill="none"
              stroke={SERIES_COLORS[(s.colorIndex ?? i) % SERIES_COLORS.length]}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s.dash ? "5 3" : undefined}
              opacity={hoverX === null ? 1 : 0.9}
            />
          ))}

          {/* Direct labels. Not decoration: the light palette's amber/emerald
              pair sits in the 6-8 CVD band, which the validator permits only
              with a secondary encoding. Placed at each series' own midpoint,
              which keeps them inside their own x-region. Muted ink, never the
              series colour — the line beside the text carries identity. */}
          {series.map((s) => {
            const pts = s.points.filter((p) => p.y !== null);
            if (!s.directLabel || pts.length === 0) return null;
            // `labelAt` picks a quiet stretch of each curve. The default
            // midpoint lands on the exact kernel's noisiest region, where the
            // text would sit on top of the data it names.
            const at = Math.min(Math.max(s.labelAt ?? 0.5, 0), 1);
            const mid = pts[Math.min(Math.round((pts.length - 1) * at), pts.length - 1)];
            return (
              <text
                key={`dl-${s.label}`}
                x={xScale(mid.x)}
                y={yScale(mid.y as number) - 8}
                textAnchor="middle"
                fontSize={10}
                fontWeight={500}
                fill="var(--muted-foreground)"
                pointerEvents="none"
              >
                {s.directLabel}
              </text>
            );
          })}

          {/* Level labels, drawn last so the series cannot paint over them and
              placed where the data is furthest from that level. A fixed
              corner collides with whatever happens to be there: the left edge
              buried them under the spread, the right edge under the exit
              marker. */}
          {levels.map((level) => {
            const at = quietXFor(level.value, series, xMin, xMax);
            return (
              <text
                key={`lvl-${level.label}`}
                x={xScale(at)}
                y={yScale(level.value) - 4}
                textAnchor="middle"
                fontSize={10}
                fill="var(--muted-foreground)"
                pointerEvents="none"
              >
                {level.label}
              </text>
            );
          })}

          {/* Called-out points, with a surface ring so they stay legible
              where they sit on the line. */}
          {markers.map((m) => (
            <g key={m.label}>
              <circle
                cx={xScale(m.x)}
                cy={yScale(m.y)}
                r={5}
                fill="var(--series-1)"
                stroke="var(--card)"
                strokeWidth={2}
              />
              <text
                x={xScale(m.x) + 8}
                y={yScale(m.y) + 14}
                fontSize={10}
                fontWeight={600}
                fill="var(--foreground)"
              >
                {m.label}
              </text>
            </g>
          ))}

          {hoverX !== null ? (
            <>
              <line
                x1={xScale(hoverX)}
                x2={xScale(hoverX)}
                y1={PLOT_MARGIN.top}
                y2={PLOT_MARGIN.top + innerHeight}
                stroke="var(--muted-foreground)"
                strokeWidth={1}
                opacity={0.6}
              />
              {readings.map(({ series: s, point }, i) =>
                point ? (
                  <circle
                    key={s.label}
                    cx={xScale(point.x)}
                    cy={yScale(point.y as number)}
                    r={4}
                    fill={
                      SERIES_COLORS[(s.colorIndex ?? i) % SERIES_COLORS.length]
                    }
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                ) : null,
              )}
            </>
          ) : null}

          <text
            x={PLOT_MARGIN.left + innerWidth / 2}
            y={height - 2}
            textAnchor="middle"
            fontSize={10}
            fill="var(--muted-foreground)"
          >
            {xConf.label}
          </text>
        </svg>
      </div>
    </ChartFrame>
  );
}

/**
 * Legend doubling as the hover readout.
 *
 * Rendered in HTML below the plot rather than as a floating tooltip: with four
 * series the card would cover the curves it describes, and this keeps the
 * values in the reading order a screen reader follows.
 */
function Legend({
  series,
  activeX,
  formatY,
  readings,
}: {
  series: LineSeries[];
  activeX: number | null;
  formatY: (v: number) => string;
  readings: { series: LineSeries; point: LinePoint | null }[];
}) {
  return (
    <div aria-live="polite" className="flex flex-wrap gap-x-5 gap-y-1.5">
      {series.map((s, i) => {
        const reading = readings.find((r) => r.series === s)?.point;
        return (
          <span key={s.label} className="flex items-center gap-2 text-xs">
            {/* Line key, not a filled box: these are lines. */}
            <svg width="14" height="8" aria-hidden className="shrink-0">
              <line
                x1="0"
                y1="4"
                x2="14"
                y2="4"
                stroke={
                  SERIES_COLORS[(s.colorIndex ?? i) % SERIES_COLORS.length]
                }
                strokeWidth={2}
                strokeDasharray={s.dash ? "4 2" : undefined}
              />
            </svg>
            <span className="text-muted-foreground">{s.label}</span>
            {activeX !== null && reading?.y != null ? (
              <span className="font-mono tabular-nums text-foreground">
                {formatY(reading.y)}
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

/**
 * The x where the plotted data sits furthest from `value`.
 *
 * Splits the domain into segments, takes the closest approach of any series
 * within each, and returns the centre of the roomiest one. Used to park a
 * horizontal level's label somewhere it will not land on the line.
 */
function quietXFor(
  value: number,
  series: LineSeries[],
  xMin: number,
  xMax: number,
  segments = 12,
): number {
  const width = (xMax - xMin) / segments;
  let bestCentre = xMin + width / 2;
  let bestClearance = -Infinity;

  for (let i = 0; i < segments; i++) {
    const lo = xMin + i * width;
    const hi = lo + width;
    let clearance = Infinity;
    for (const s of series) {
      for (const point of s.points) {
        if (point.y === null || point.x < lo || point.x > hi) continue;
        clearance = Math.min(clearance, Math.abs(point.y - value));
      }
    }
    // An empty segment is maximally clear, but prefer somewhere with context.
    if (clearance === Infinity) clearance = Number.MAX_SAFE_INTEGER / 2;
    if (clearance > bestClearance) {
      bestClearance = clearance;
      bestCentre = lo + width / 2;
    }
  }
  return bestCentre;
}

/** Nearest defined point in a series to an x, or null if it has none nearby. */
function nearestPoint(series: LineSeries, x: number): LinePoint | null {
  let best: LinePoint | null = null;
  let bestDistance = Infinity;
  for (const point of series.points) {
    if (point.y === null) continue;
    const distance = Math.abs(point.x - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = point;
    }
  }
  // Beyond a series' own domain there is no honest value to show.
  return best !== null && bestDistance <= 2 ? best : null;
}

/** Down-sampled table: every x would be hundreds of rows nobody reads. */
function tableRows(
  figure: LinesFigure,
  formatY: (v: number) => string,
): (string | number)[][] {
  const xs = [...new Set(figure.series.flatMap((s) => s.points.map((p) => p.x)))]
    .sort((a, b) => a - b)
    .filter((_, i, arr) => i % Math.max(1, Math.ceil(arr.length / 25)) === 0);

  return xs.map((x) => [
    formatNumber(x, 1),
    ...figure.series.map((s) => {
      const point = nearestPoint(s, x);
      return point?.y != null ? formatY(point.y) : "—";
    }),
  ]);
}

function ariaSummary(figure: LinesFigure): string {
  const names = figure.series.map((s) => s.label).join(", ");
  return `${figure.title}. ${figure.series.length} series (${names}) plotted against ${figure.x.label}, with ${figure.y.label} on a ${figure.y.scale === "log" ? "logarithmic" : "linear"} axis. Values are listed in the accompanying data table.`;
}
