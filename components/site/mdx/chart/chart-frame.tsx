import { cn } from "@/lib/utils";

/**
 * Shared shell for every figure: title, plot slot, optional controls, caption,
 * and a `<details>` data table.
 *
 * The table is not an afterthought. It is the accessible equivalent of the
 * plot for screen readers, the fallback when the SVG can't be perceived, and
 * the honest-sourcing gesture for a research post. Per the dataviz rules, a
 * tooltip may never be the only route to a value.
 */
export function ChartFrame({
  title,
  caption,
  source,
  controls,
  readout,
  table,
  children,
  className,
}: {
  title: string;
  caption?: string;
  source?: string;
  controls?: React.ReactNode;
  readout?: React.ReactNode;
  table?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "my-8 rounded-lg border border-border/60 bg-card/40 not-prose",
        className,
      )}
    >
      <div className="border-b border-border/60 px-4 py-3">
        <p className="text-sm font-medium tracking-tight text-foreground">
          {title}
        </p>
      </div>

      <div className="px-2 pt-4 sm:px-4">{children}</div>

      {readout ? (
        <div className="px-4 pb-1 sm:px-4">{readout}</div>
      ) : null}

      {controls ? (
        <div className="border-t border-border/60 px-4 py-4 print:hidden">
          {controls}
        </div>
      ) : null}

      {caption || source || table ? (
        <figcaption className="space-y-3 border-t border-border/60 px-4 py-3 text-sm text-muted-foreground">
          {caption ? <p>{caption}</p> : null}
          {table ? (
            <details className="group print:hidden">
              <summary className="cursor-pointer list-none font-mono text-xs tracking-widest text-brand uppercase [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">Show data</span>
                <span className="hidden group-open:inline">Hide data</span>
              </summary>
              <div className="mt-3 max-h-80 overflow-auto rounded-md border border-border/60">
                {table}
              </div>
            </details>
          ) : null}
          {source ? (
            <p className="font-mono text-xs text-muted-foreground/80">
              Source: {source}
            </p>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** Consistent table chrome for the `<details>` data view. */
export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <table className="w-full border-collapse text-left text-xs">
      <thead className="sticky top-0 bg-card">
        <tr>
          {columns.map((column, i) => (
            <th
              key={column}
              scope="col"
              className={cn(
                "border-b border-border/60 px-3 py-2 font-medium text-foreground",
                i > 0 && "text-right",
              )}
            >
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="font-mono">
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-border/40 last:border-0">
            {row.map((cell, j) => (
              <td
                key={j}
                className={cn("px-3 py-1.5", j > 0 && "text-right tabular-nums")}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Placeholder shown when a figure's `src` can't be loaded. */
export function ChartError({ src }: { src: string }) {
  return (
    <div className="my-8 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground not-prose">
      Figure data unavailable
      <span className="mt-1 block font-mono text-xs opacity-70">{src}</span>
    </div>
  );
}
