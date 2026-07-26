import { ChartFrame, DataTable } from "@/components/site/mdx/chart/chart-frame";
import { VegaView } from "@/components/site/mdx/chart/vega-view";
import type { DatasetPayload } from "@/lib/charts/dataset";
import { rowCount } from "@/lib/charts/dataset";
import { formatCell } from "@/lib/charts/format";

/**
 * The two server-rendered widths, and the accessible table beneath them.
 *
 * Both SVGs ship in the HTML and CSS picks one. That is the price of dropping
 * the client-side re-measure: a single 720px figure scaled to a 375px screen
 * renders its 11px labels at about 5px, which is the failure the old
 * `useChartSize` hook existed to avoid.
 *
 * Each width then hands off to a live Vega view, so tooltips and hover come
 * from the library rather than from anything written here. The server markup
 * is the fallback underneath: it is what renders with JavaScript off, on the
 * first paint, and when printing.
 */
export function ChartFigure({
  title,
  caption,
  source,
  description,
  svg,
  spec,
  data,
  table,
  controls,
  readout,
  legend,
}: {
  title: string;
  caption?: string;
  source?: string;
  /** Prose equivalent of the plot, announced to screen readers. */
  description: string;
  svg: { narrow: string; wide: string };
  /** Compiled Vega specs per width, handed to the live view after hydration. */
  spec: { narrow: Record<string, unknown>; wide: Record<string, unknown> };
  /** The rows both specs draw. Identical per width, so they ship once. */
  data: Record<string, unknown[]>;
  table?: React.ReactNode;
  controls?: React.ReactNode;
  readout?: React.ReactNode;
  legend?: React.ReactNode;
}) {
  return (
    <ChartFrame
      title={title}
      caption={caption}
      source={source}
      controls={controls}
      readout={readout}
      legend={legend}
      table={table}
    >
      {/* One role="img" wrapper carries the description for both copies, so
          assistive technology is not handed the same figure twice. */}
      <div role="img" aria-label={description}>
        <VegaView
          className="sm:hidden"
          spec={spec.narrow}
          data={data}
          fallback={svg.narrow}
        />
        <VegaView
          className="hidden sm:block print:block"
          spec={spec.wide}
          data={data}
          fallback={svg.wide}
        />
      </div>
    </ChartFrame>
  );
}

/**
 * A dataset rendered as the figure's data table.
 *
 * Not an afterthought: it is the route to every plotted value for anyone who
 * cannot perceive the SVG, and the reason a tooltip is never the only way to
 * read a number. Long datasets are truncated with the count stated, because a
 * silently clipped table implies the figure holds fewer points than it does.
 */
export function DatasetTable({
  payload,
  limit = 200,
}: {
  payload: DatasetPayload;
  limit?: number;
}) {
  const total = rowCount(payload);
  const shown = Math.min(total, limit);

  const rows = Array.from({ length: shown }, (_, i) =>
    payload.columns.map((column) =>
      formatCell(payload.data[column.key]?.[i] ?? null, column),
    ),
  );

  return (
    <>
      <DataTable
        columns={payload.columns.map((column) => column.label)}
        rows={rows}
      />
      {shown < total ? (
        <p className="border-t border-border/60 px-3 py-2 text-xs text-muted-foreground">
          Showing the first {shown.toLocaleString("en-US")} of{" "}
          {total.toLocaleString("en-US")} rows.
        </p>
      ) : null}
    </>
  );
}
