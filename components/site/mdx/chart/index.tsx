import { Suspense } from "react";

import { ChartError } from "@/components/site/mdx/chart/chart-frame";
import { ChartFigure, DatasetTable } from "@/components/site/mdx/chart/chart-figure";
import { ChartPending } from "@/components/site/mdx/chart/chart-pending";
import {
  InteractiveFigure,
  type ControlConfig,
} from "@/components/site/mdx/chart/interactive-figure";
import { numericColumn } from "@/lib/charts/dataset";
import { renderFigure } from "@/lib/charts/render";
import { getChartBySlug, type ResolvedChart } from "@/lib/data/charts";

/**
 * `<Chart slug="pairs-equity" />`
 *
 * A server component: the spec and its datasets are resolved and rendered to
 * SVG during the server render, so the browser receives a finished figure
 * rather than a URL. After hydration a live Vega view takes over the same
 * spec, which is where tooltips and parameter redraws come from.
 *
 * Each figure sits behind its own boundary, which is what lets the prose reach
 * the reader first. Without it the whole article waits on the slowest dataset
 * query, and an article carries four of these — so the paragraph above figure
 * one is held back by figure four for no reason the reader can see. The
 * fallback reserves the exact final height, so filling them in shifts nothing.
 *
 * `title` and `caption` override what the chart record carries. The record
 * describes the data; a caption is part of the article's argument, so it
 * belongs in the MDX where it stays next to the prose it supports.
 */
export function Chart({
  slug,
  title,
  caption,
}: {
  slug: string;
  title?: string;
  caption?: string;
}) {
  return (
    <Suspense fallback={<ChartPending />}>
      <DatabaseChart slug={slug} title={title} caption={caption} />
    </Suspense>
  );
}

/** Vega-Lite ignores `usermeta`, which makes it the place for anything the grammar has no opinion about. */
type Usermeta = {
  control?: ControlConfig & {
    fields?: Record<string, string>;
    winRate?: { dataset: string; value: string; rate: string };
  };
};

async function DatabaseChart({
  slug,
  title,
  caption,
}: {
  slug: string;
  title?: string;
  caption?: string;
}) {
  const resolved = await getChartBySlug(slug);
  if (!resolved) return <ChartError src={slug} />;

  try {
    return await renderChart(resolved, title, caption);
  } catch (error) {
    // A spec that will not compile, or a dataset whose columns moved, leaves a
    // placeholder in one figure rather than failing the whole article.
    console.warn(
      `[chart] ${slug} failed to render. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return <ChartError src={slug} />;
  }
}

async function renderChart(
  { chart, data }: ResolvedChart,
  titleOverride?: string,
  captionOverride?: string,
) {
  const spec = chart.spec as Record<string, unknown>;
  const payloads = Object.fromEntries(
    Object.entries(data).map(([name, dataset]) => [name, dataset.payload]),
  );

  const title = titleOverride ?? chart.title;
  const caption = captionOverride ?? chart.caption ?? undefined;
  const source = data.main?.source ?? undefined;
  const control = (spec.usermeta as Usermeta | undefined)?.control;
  const description = control?.description ?? `${title}.`;

  const [narrow, wide] = await Promise.all([
    renderFigure(spec, payloads, "narrow"),
    renderFigure(spec, payloads, "wide"),
  ]);

  const svg = { narrow: narrow.svg, wide: wide.svg };
  const compiled = { narrow: narrow.spec, wide: wide.spec };
  // Both widths compile to the same dataset names over the same rows, so one
  // copy serves both views.
  const rows = wide.data;

  if (!control) {
    return (
      <ChartFigure
        title={title}
        caption={caption}
        source={source}
        description={description}
        svg={svg}
        spec={compiled}
        data={rows}
        table={data.main ? <DatasetTable payload={data.main.payload} /> : undefined}
      />
    );
  }

  const main = data.main;
  if (!main) throw new Error("An interactive chart needs a `main` dataset");

  // The read-out's numbers, which are React's rather than Vega's: they appear
  // in prose next to the figure, so they use the site's formatters.
  const fields = control.fields ?? {};
  const series = {
    gross: numericColumn(main.payload, fields.gross ?? "gross").map((v) => v ?? 0),
    turnover: numericColumn(main.payload, fields.turnover ?? "turnover").map(
      (v) => v ?? 0,
    ),
  };

  const binding = control.winRate;
  const winRatePayload = binding ? data[binding.dataset]?.payload : undefined;
  const winRate =
    binding && winRatePayload
      ? {
          bps: numericColumn(winRatePayload, binding.value).map((v) => v ?? 0),
          rate: numericColumn(winRatePayload, binding.rate).map((v) => v ?? 0),
        }
      : undefined;

  return (
    <InteractiveFigure
      title={title}
      caption={caption}
      source={source}
      description={description}
      control={control}
      svg={svg}
      spec={compiled}
      data={rows}
      series={series}
      winRate={winRate}
    />
  );
}
