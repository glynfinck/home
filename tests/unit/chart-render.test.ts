import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as vega from "vega";

import { datasetPayloadSchema, type DatasetPayload } from "@/lib/charts/dataset";
import {
  BREAKPOINTS,
  assertRenderableSpec,
  renderSvg,
  type ChartData,
} from "@/lib/charts/render";
import { netTotal } from "@/lib/chart";

/**
 * The four figures, as they are stored.
 *
 * Read from the generated seed rather than from a live database so this stays
 * a unit test: it pins the conversion in `scripts/migrate-figures.mts` and the
 * renderer, neither of which needs Supabase running.
 */
const seed = readFileSync(
  join(process.cwd(), "supabase/seeds/figures.sql"),
  "utf8",
);

function sqlJson<T>(after: string, occurrence = 0): T {
  // The generator emits `'<json>'::jsonb` with SQL-escaped single quotes.
  const pattern = new RegExp(`${after}[\\s\\S]*?'((?:[^']|'')*)'::jsonb`, "g");
  const matches = [...seed.matchAll(pattern)];
  const match = matches[occurrence];
  if (!match) throw new Error(`No jsonb literal after ${after}`);
  return JSON.parse(match[1].replace(/''/g, "'")) as T;
}

function datasetPayload(slug: string): DatasetPayload {
  const start = seed.indexOf(`from public.datasets d where d.slug = '${slug}'`);
  expect(start, `dataset ${slug} is in the seed`).toBeGreaterThan(-1);
  const block = seed.slice(seed.lastIndexOf("insert into public.dataset_versions", start), start);
  const literals = [...block.matchAll(/'((?:[^']|'')*)'::jsonb/g)].map((m) =>
    JSON.parse(m[1].replace(/''/g, "'")),
  );
  return datasetPayloadSchema.parse({ columns: literals[0], data: literals[1] });
}

function chart(slug: string): {
  spec: Record<string, unknown>;
  bindings: Record<string, { slug: string }>;
} {
  const marker = `values ('${slug}'`;
  const start = seed.indexOf(marker);
  expect(start, `chart ${slug} is in the seed`).toBeGreaterThan(-1);
  const block = seed.slice(start, seed.indexOf("on conflict (slug) do update", start));
  const literals = [...block.matchAll(/'((?:[^']|'')*)'::jsonb/g)].map((m) =>
    JSON.parse(m[1].replace(/''/g, "'")),
  );
  return { spec: literals[0], bindings: literals[1] };
}

function chartData(bindings: Record<string, { slug: string }>): ChartData {
  return Object.fromEntries(
    Object.entries(bindings).map(([name, binding]) => [
      name,
      datasetPayload(binding.slug),
    ]),
  );
}

const FIGURES = [
  "pairs-volume-rank",
  "pairs-crossover",
  "pairs-trade-anatomy",
  "pairs-equity",
] as const;

describe("figure specs render", () => {
  for (const slug of FIGURES) {
    it(`${slug} renders at both breakpoints`, async () => {
      const { spec, bindings } = chart(slug);
      const data = chartData(bindings);

      for (const breakpoint of ["narrow", "wide"] as const) {
        const svg = await renderSvg(spec, data, breakpoint);

        expect(svg.startsWith("<svg")).toBe(true);
        // Vega draws both lines and bars as <path>; bars carry fill, lines stroke.
        expect(svg).toMatch(/<path[^>]*(stroke|fill)="var\(--/);
        // The browser test looks for the figure in the initial HTML at this
        // width; a silently empty render would still "pass" without this.
        expect(svg.length).toBeGreaterThan(1000);
        expect(svg).toContain(`width="${BREAKPOINTS[breakpoint].width}"`);
      }
    });
  }

  it("keeps CSS custom properties intact, so the theme toggle needs no JS", async () => {
    const { spec, bindings } = chart("pairs-crossover");
    const svg = await renderSvg(spec, bindings ? chartData(bindings) : {}, "wide");

    expect(svg).toContain('stroke="var(--series-1)"');
    expect(svg).toContain("var(--muted-foreground)");
    // A continuous colour scale would silently emit these instead.
    expect(svg).not.toContain("NaN");
  });

  it("draws every decade label on the log axis, with an ASCII minus", async () => {
    const { spec, bindings } = chart("pairs-crossover");
    const svg = await renderSvg(spec, chartData(bindings), "wide");

    for (const decade of [-13, -11, -9, -7, -5, -3, -1]) {
      expect(svg).toContain(`1e${decade}`);
    }
    // d3-format's default is U+2212, which would disagree with the hyphen in
    // the data table and the prose directly beneath the figure.
    expect(svg).not.toContain("−");
  });

  /**
   * The load-bearing property of the render config.
   *
   * Headless Vega has no canvas, so it estimates text width as
   * `0.8 * length * fontSize`, which overshoots real labels by roughly half.
   * Under Vega's default layout that estimate sets the axis gutter and feeds
   * overlap removal, so labels get dropped. `autosize: none` plus explicit
   * ticks takes text metrics out of the layout entirely. If someone removes
   * either, this test fails rather than the figures quietly degrading.
   */
  it("emits identical SVG under a different text metric", async () => {
    const { spec, bindings } = chart("pairs-crossover");
    const data = chartData(bindings);

    const before = await renderSvg(spec, data, "wide");

    // `textMetrics` is a documented override point (vl-convert uses it) but is
    // absent from vega's published types.
    const metrics = (vega as unknown as {
      textMetrics: {
        width: (item: { fontSize?: number }, text: unknown) => number;
      };
    }).textMetrics;

    const original = metrics.width;
    metrics.width = (item, text) =>
      0.4 * String(text).length * (item.fontSize ?? 11);
    try {
      const after = await renderSvg(spec, data, "wide");
      expect(after).toBe(before);
    } finally {
      metrics.width = original;
    }
  });
});

describe("assertRenderableSpec", () => {
  it("rejects a CSS variable inside a continuous colour scale", () => {
    expect(() =>
      assertRenderableSpec({
        encoding: {
          color: {
            field: "y",
            scale: { type: "linear", range: ["var(--series-1)", "var(--series-2)"] },
          },
        },
      }),
    ).toThrow(/cannot use CSS variables/);
  });

  it("allows a categorical scale with the same range", () => {
    expect(() =>
      assertRenderableSpec({
        encoding: {
          color: {
            field: "series",
            scale: { domain: ["a", "b"], range: ["var(--series-1)", "var(--series-2)"] },
          },
        },
      }),
    ).not.toThrow();
  });
});

describe("parameterised figures", () => {
  /**
   * Vega redraws the curve from the spec's own transforms when the parameter
   * changes, so there is no second implementation of the fee identity to keep
   * in step. What still has to hold is that the spec and the read-out agree at
   * the default: the figure's SVG is drawn by Vega, the numbers under it come
   * from `lib/chart.ts`, and the article's prose quotes both.
   */
  it("declares the parameter the control drives", () => {
    const { spec } = chart("pairs-equity");
    const params = spec.params as { name: string; value: number }[];

    expect(params).toHaveLength(1);
    expect(params[0].name).toBe("fee");
    // A `bind` here would make Vega render its own widget alongside the
    // site's styled, keyboard-tested range input.
    expect(params[0]).not.toHaveProperty("bind");

    const control = (spec.usermeta as { control: { param: string } }).control;
    expect(control.param).toBe(params[0].name);
  });

  it("derives net from the parameter in the spec, not in TypeScript", () => {
    const { spec } = chart("pairs-equity");
    const transforms = spec.transform as Record<string, unknown>[];

    const calculate = transforms.find((t) => "calculate" in t);
    expect(calculate?.calculate).toContain("fee");
    expect(calculate?.as).toBe("net");

    // Cumulative, so the plotted value is the running total.
    const window = transforms.find((t) => "window" in t);
    expect(JSON.stringify(window)).toContain("equity");
  });

  it("still agrees with the paper's headline number", () => {
    const daily = datasetPayload("pairs-equity-daily");
    const series = {
      gross: daily.data.gross as number[],
      turnover: daily.data.turnover as number[],
    };
    expect(netTotal(series, 2)).toBeCloseTo(1896.33, 1);
  });

  it("pins the y domain across the whole parameter range", () => {
    // A refitting axis would keep the curve looking identical at every fee and
    // hide the very thing the reader is being asked to look at.
    const { spec } = chart("pairs-equity");
    const layers = spec.layer as Record<string, unknown>[];
    const line = layers.find(
      (layer) => (layer.mark as { type?: string })?.type === "line",
    );
    const y = (line!.encoding as Record<string, Record<string, unknown>>).y;
    const scale = y.scale as { domain: number[]; nice: boolean };

    expect(scale.domain).toHaveLength(2);
    expect(scale.nice).toBe(false);
    expect(scale.domain[0]).toBeLessThan(0);
    expect(scale.domain[1]).toBeGreaterThan(1896);
  });
});

describe("tooltips come from the library", () => {
  /**
   * Every figure has to be interrogable by pointer. That is Vega-Lite's
   * `tooltip` encoding rather than anything hand-rolled, so what is worth
   * asserting is that each spec actually declares one; the rendering of it is
   * the library's problem.
   */
  for (const slug of FIGURES) {
    it(`${slug} declares a tooltip encoding`, () => {
      const { spec } = chart(slug);
      const encodings: unknown[] = [];

      const walk = (node: unknown): void => {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) return node.forEach(walk);
        const record = node as Record<string, unknown>;
        if (record.tooltip) encodings.push(record.tooltip);
        Object.values(record).forEach(walk);
      };
      walk(spec);

      expect(encodings.length).toBeGreaterThan(0);
      // Named fields, not `true`: the generic form dumps every encoded channel
      // including the ones we compute for layout.
      expect(Array.isArray(encodings[0])).toBe(true);
    });
  }
});
