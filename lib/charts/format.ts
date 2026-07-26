import type { CellValue, ColumnDef } from "@/lib/charts/dataset";
import {
  formatBps,
  formatNumber,
  formatPercent,
  formatSci,
  formatUsd,
  formatUsdCompact,
} from "@/lib/chart";

/**
 * Render one cell the way its column says to.
 *
 * The formatters themselves stay in `lib/chart.ts`, which is where the figures
 * and the prose around them have always agreed on how a dollar looks. This is
 * only the mapping from a column's declared format to one of them, so a
 * dataset can carry that decision once instead of every chart restating it.
 */
export function formatCell(value: CellValue, column: ColumnDef): string {
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value;

  switch (column.format) {
    case "usd":
      return formatUsd(value);
    case "usd-compact":
      return formatUsdCompact(value);
    case "percent":
      return formatPercent(value, column.digits ?? 1);
    case "bps":
      return formatBps(value);
    case "sci":
      return value === 0 ? "0" : formatSci(value);
    case "plain":
    default:
      return column.type === "integer"
        ? value.toLocaleString("en-US")
        : formatNumber(value, column.digits ?? 3);
  }
}
