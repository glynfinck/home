import { DatasetTable } from "@/components/site/mdx/chart/chart-figure";
import { ChartError } from "@/components/site/mdx/chart/chart-frame";
import { getDatasetBySlug } from "@/lib/data/charts";

/**
 * `<Table slug="pairs-liquidity-ladder" />`
 *
 * The same dataset a figure draws, shown as a table. Splitting data from
 * presentation makes this nearly free: no second copy of the numbers, and no
 * way for the table in the prose to disagree with the chart above it.
 *
 * `columns` narrows and orders what is shown, for datasets carrying more than
 * the paragraph needs.
 */
export async function Table({
  slug,
  columns,
  caption,
}: {
  slug: string;
  columns?: string[];
  caption?: string;
}) {
  const dataset = await getDatasetBySlug(slug);
  if (!dataset) return <ChartError src={slug} />;

  const payload = columns
    ? {
        columns: columns
          .map((key) => dataset.payload.columns.find((c) => c.key === key))
          .filter((column) => column !== undefined),
        data: dataset.payload.data,
      }
    : dataset.payload;

  if (payload.columns.length === 0) return <ChartError src={slug} />;

  return (
    <figure className="not-prose my-8 rounded-lg border border-border/60 bg-card/40">
      <div className="max-h-96 overflow-auto">
        <DatasetTable payload={payload} />
      </div>
      {caption || dataset.source ? (
        <figcaption className="space-y-2 border-t border-border/60 px-4 py-3 text-sm text-muted-foreground">
          {caption ? <p>{caption}</p> : null}
          {dataset.source ? (
            <p className="font-mono text-xs text-muted-foreground/80">
              Source: {dataset.source}
            </p>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
