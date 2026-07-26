import "server-only";

import * as vega from "vega";
import * as vegaLite from "vega-lite";

import type { DatasetPayload } from "@/lib/charts/dataset";
import { toRows } from "@/lib/charts/dataset";

/**
 * Vega-Lite spec to SVG string, on the server.
 *
 * Rendering here rather than only in the browser is what keeps a figure in the
 * initial HTML: something to look at before hydration, with JavaScript off,
 * and on paper. The live view takes over afterwards (see `VegaView`), which is
 * where tooltips and parameter redraws come from.
 *
 * Two settings carry most of the weight, and neither is cosmetic:
 *
 * - `autosize: none` with explicit `padding`. Under Vega's default (`pad`),
 *   the axis gutter is derived from measured text bounds. Headless Node has
 *   no canvas, so `vega-scenegraph` falls back to `0.8 * length * fontSize`,
 *   which overshoots our labels by roughly half. That would widen gutters and,
 *   worse, feed overlap removal so real labels get dropped. Under `none`, the
 *   layout never reads text bounds and the SVG is a pure function of the spec
 *   and the data (there is a unit test asserting exactly that). It also makes
 *   the server and browser renders geometrically identical, so the handover is
 *   invisible.
 * - `labelOverlap: false` with explicit tick `values`. Tick thinning is the
 *   other consumer of text bounds; we choose the ticks instead.
 *
 * Do not add the native `canvas` package to "fix" the metrics. It measures
 * raster and SVG canvases differently (vega#2940), it is a native build on a
 * serverless deploy, and the site's font would not be installed there anyway.
 */

/**
 * d3-format renders negatives with U+2212 MINUS SIGN. It is the typographically
 * correct character, but the readout, the data table and the prose around the
 * figure all use an ASCII hyphen, and a figure whose axis disagrees with the
 * sentence under it reads as a bug. One locale override fixes every axis at
 * once, rather than every label expression separately.
 */
vega.formatLocale({
  decimal: ".",
  thousands: ",",
  grouping: [3],
  currency: ["$", ""],
  minus: "-",
});

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

/**
 * Site chrome for every figure.
 *
 * Colours are CSS custom properties, passed through to `fill`/`stroke`
 * verbatim by Vega's SVG renderer. That is why a figure follows the theme
 * toggle with no JavaScript, exactly as the hand-rolled SVG did. It only holds
 * for categorical colour: a continuous scale runs the endpoints through
 * d3-color, which cannot parse `var(...)` and yields `rgb(NaN,NaN,NaN)`.
 * `assertRenderableSpec` rejects that combination.
 */
export const CHART_CONFIG = {
  // Our <figure> wrapper carries role="img" and the prose description, so
  // Vega's own container ARIA would be a second, competing announcement.
  aria: false,
  background: "transparent",
  font: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  view: { stroke: null },
  axis: {
    labelOverlap: false,
    labelLimit: 0,
    titleLimit: 0,
    labelFontSize: 11,
    labelColor: "var(--muted-foreground)",
    titleColor: "var(--muted-foreground)",
    titleFontSize: 11,
    titleFontWeight: 400 as const,
    gridColor: "var(--border)",
    gridWidth: 1,
    gridDash: [] as number[],
    domain: false,
    ticks: false,
    labelPadding: 6,
  },
  line: {
    strokeWidth: 2,
    strokeJoin: "round" as const,
    strokeCap: "round" as const,
  },
  bar: { fill: "var(--brand)" },
  point: { fill: "var(--brand)", stroke: "var(--card)", strokeWidth: 2 },
  rule: { color: "var(--muted-foreground)" },
  text: { fontSize: 10, fill: "var(--muted-foreground)" },
  range: {
    category: ["var(--series-1)", "var(--series-2)", "var(--series-3)"],
  },
};

/** Colour scale types that parse their range through d3-color. */
const CONTINUOUS_SCALES = new Set([
  "linear",
  "log",
  "pow",
  "sqrt",
  "symlog",
  "sequential",
  "quantile",
  "quantize",
  "threshold",
  "bin-ordinal",
]);

/**
 * Reject the spec shapes that render silently wrong rather than failing.
 *
 * A CSS variable inside a continuous colour scale produces invisible marks,
 * not an error, so it has to be caught on the write path where an admin can
 * still see the message.
 */
export function assertRenderableSpec(spec: unknown): void {
  const seen = new Set<object>();

  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    const record = node as Record<string, unknown>;
    const scale = record.scale as Record<string, unknown> | undefined;
    if (scale && typeof scale === "object") {
      const usesVar = JSON.stringify(scale.range ?? "").includes("var(--");
      const type = typeof scale.type === "string" ? scale.type : "";
      if (usesVar && CONTINUOUS_SCALES.has(type)) {
        throw new Error(
          `A ${type} colour scale cannot use CSS variables (they render as rgb(NaN)). Use a categorical scale, or resolved hex values.`,
        );
      }
      if (usesVar && scale.scheme) {
        throw new Error(
          "A colour scheme cannot be combined with CSS variables in its range.",
        );
      }
    }

    Object.values(record).forEach(walk);
  };

  walk(spec);
}

export type ChartData = Record<string, DatasetPayload>;

/**
 * Merge the site config, the breakpoint geometry and the resolved datasets
 * into a spec Vega-Lite can compile.
 *
 * Datasets arrive keyed by the name the spec refers to. A single-dataset chart
 * uses `main`, which is also what `data: {"name": "main"}` in the spec means.
 */
export function prepareSpec(
  spec: Record<string, unknown>,
  data: ChartData,
  breakpoint: Breakpoint,
): Record<string, unknown> {
  const geometry = BREAKPOINTS[breakpoint];
  const inner = {
    width: geometry.width - geometry.padding.left - geometry.padding.right,
    height: geometry.height - geometry.padding.top - geometry.padding.bottom,
  };

  const datasets: Record<string, unknown[]> = {};
  for (const [name, payload] of Object.entries(data)) {
    datasets[name] = toRows(payload);
  }

  return {
    ...spec,
    autosize: { type: "none" },
    padding: geometry.padding,
    width: inner.width,
    height: inner.height,
    // Named datasets, so a layered spec can reference more than one and the
    // spec itself stays free of literal values.
    datasets,
    config: {
      ...CHART_CONFIG,
      // Axis titles are the last thing whose position Vega derives from
      // measured label bounds: without pinning, the y title slides 22px
      // sideways when the text estimate changes. Pinned here rather than in
      // the stored spec because the coordinates are breakpoint geometry.
      axisX: {
        titleX: inner.width / 2,
        titleY: geometry.padding.bottom - 6,
        titleAngle: 0,
        titleAlign: "center",
        titleBaseline: "bottom",
      },
      axisY: {
        titleX: -(geometry.padding.left - 10),
        titleY: inner.height / 2,
        titleAngle: -90,
        titleAlign: "center",
        titleBaseline: "bottom",
      },
      ...((spec.config as Record<string, unknown>) ?? {}),
    },
  };
}

/**
 * Drop invisible hit-target layers before rendering to a string.
 *
 * Tooltips on a line need something wider than a 2px stroke to point at, so
 * those specs carry a layer of `opacity: 0` points. In the live view they are
 * the hit area; in the server-rendered SVG they are several hundred invisible
 * path elements per figure, at two widths — enough to more than double the
 * size of an article's HTML for marks nobody can see or interact with.
 *
 * Safe because the hit layer plots the fields the visible mark already plots,
 * so removing it cannot move a scale domain, and the two renders stay
 * geometrically identical.
 */
function withoutHitLayers(spec: Record<string, unknown>): Record<string, unknown> {
  const layers = spec.layer;
  if (!Array.isArray(layers)) return spec;

  const visible = layers.filter((layer) => {
    const mark = (layer as { mark?: unknown }).mark;
    return !(
      mark &&
      typeof mark === "object" &&
      (mark as { opacity?: number }).opacity === 0
    );
  });

  return visible.length === layers.length ? spec : { ...spec, layer: visible };
}

/** Compile to a Vega spec. Throws with Vega-Lite's own message when invalid. */
export function compileSpec(spec: Record<string, unknown>): vega.Spec {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return vegaLite.compile(spec as any).spec as vega.Spec;
}

/**
 * A figure at one width: the SVG for the first paint, and the compiled Vega
 * spec the browser re-animates it from.
 *
 * Both come from a single compile so the two can never describe different
 * figures, and the compiled spec carries its data inline — the client needs no
 * second fetch and no dataset-name bookkeeping.
 */
export async function renderFigure(
  spec: Record<string, unknown>,
  data: ChartData,
  breakpoint: Breakpoint,
): Promise<{
  svg: string;
  spec: Record<string, unknown>;
  data: Record<string, unknown[]>;
}> {
  const prepared = prepareSpec(spec, data, breakpoint);
  assertRenderableSpec(prepared);

  const compiled = compileSpec(prepared);
  // `renderer: "none"` suppresses the live renderer only; `toSVG()` runs the
  // string renderer and awaits the dataflow itself. This is the vega-cli path.
  const view = new vega.View(vega.parse(compileSpec(withoutHitLayers(prepared))), {
    renderer: "none",
  });
  const svg = await view.toSVG();
  view.finalize();

  // Round-tripped through JSON deliberately. Vega-Lite's compiler returns
  // class instances and null-prototype objects, which React refuses to send
  // from a server component to a client one — and it refuses by throwing, so
  // the figure disappears rather than degrading. The browser needs plain JSON
  // anyway.
  const plain = JSON.parse(JSON.stringify(compiled)) as {
    data?: { name: string; values?: unknown[] }[];
  } & Record<string, unknown>;

  // Rows are lifted out of the spec and returned alongside it. A figure is
  // rendered at two widths and both specs would otherwise carry an identical
  // copy of the data, doubling the payload for nothing — enough, on an article
  // with four figures, to measurably delay hydration.
  const rows: Record<string, unknown[]> = {};
  for (const source of plain.data ?? []) {
    if (!source.values) continue;
    rows[source.name] = source.values;
    delete source.values;
  }

  return { svg, spec: plain, data: rows };
}

/** SVG only, for callers that never hydrate (the admin preview). */
export async function renderSvg(
  spec: Record<string, unknown>,
  data: ChartData,
  breakpoint: Breakpoint,
): Promise<string> {
  return (await renderFigure(spec, data, breakpoint)).svg;
}
