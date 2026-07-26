import { z } from "zod";

/**
 * The one table shape every figure is built from.
 *
 * Storage is columnar (`{ day: [...], gross: [...] }`) rather than an array of
 * row objects. Charting grammars want rows, but columns are what everything
 * else wants: they compress far better than repeated object keys, a column's
 * type is a property of the column rather than re-asserted per row, and the
 * accessible data table renders straight from them. Rows are materialised at
 * render time by `toRows`.
 *
 * `null` inside a numeric column is a gap, not a zero. That is what lets one
 * series cover part of an axis (the crossover figure's exact kernel stops
 * where SciPy's `pbdv` gives out) without splitting it into two datasets.
 */

export const COLUMN_TYPES = [
  "number",
  "integer",
  "string",
  "date",
  "boolean",
] as const;
export type ColumnType = (typeof COLUMN_TYPES)[number];

/**
 * How a value is rendered in axes, tooltips and the data table. Formatting is
 * a property of the column, not of each figure that draws it, so two charts
 * over the same dataset cannot disagree about whether a number is dollars.
 */
export const COLUMN_FORMATS = [
  "plain",
  "usd",
  "usd-compact",
  "percent",
  "bps",
  "sci",
] as const;
export type ColumnFormat = (typeof COLUMN_FORMATS)[number];

export const columnDefSchema = z.object({
  // Identifier used by chart specs. Constrained so it is always a safe field
  // reference in an expression, whatever the source file called it.
  key: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, digits, underscores"),
  label: z.string().trim().min(1),
  type: z.enum(COLUMN_TYPES),
  format: z.enum(COLUMN_FORMATS).optional(),
  digits: z.number().int().min(0).max(12).optional(),
  unit: z.string().optional(),
});
export type ColumnDef = z.infer<typeof columnDefSchema>;

export type CellValue = number | string | boolean | null;

export const datasetPayloadSchema = z
  .object({
    columns: z.array(columnDefSchema).min(1),
    data: z.record(
      z.string(),
      z.array(z.union([z.number(), z.string(), z.boolean(), z.null()])),
    ),
  })
  .superRefine((payload, ctx) => {
    const keys = payload.columns.map((column) => column.key);

    const duplicate = keys.find((key, i) => keys.indexOf(key) !== i);
    if (duplicate) {
      ctx.addIssue({ code: "custom", message: `Duplicate column: ${duplicate}` });
    }

    const missing = keys.filter((key) => !(key in payload.data));
    if (missing.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: `Column without data: ${missing.join(", ")}`,
      });
    }

    const extra = Object.keys(payload.data).filter((key) => !keys.includes(key));
    if (extra.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: `Data without a column definition: ${extra.join(", ")}`,
      });
    }

    // Ragged columns are the failure mode that produces a chart which renders
    // fine and is silently wrong, so it is rejected at the door.
    const lengths = new Set(keys.map((key) => payload.data[key]?.length ?? -1));
    lengths.delete(-1);
    if (lengths.size > 1) {
      ctx.addIssue({
        code: "custom",
        message: "Every column must have the same number of rows",
      });
    }
  });

export type DatasetPayload = z.infer<typeof datasetPayloadSchema>;

/** Row count of a payload. Zero when it has no columns. */
export function rowCount(payload: DatasetPayload): number {
  const first = payload.columns[0];
  return first ? (payload.data[first.key]?.length ?? 0) : 0;
}

/**
 * Columnar payload to row objects, which is what charting grammars consume.
 *
 * `keys` narrows the output to the columns a figure actually draws. A dataset
 * carrying ten columns for one chart that plots two should not ship the other
 * eight to the browser.
 */
export function toRows(
  payload: DatasetPayload,
  keys?: string[],
): Record<string, CellValue>[] {
  const columns = keys
    ? payload.columns.filter((column) => keys.includes(column.key))
    : payload.columns;
  const total = rowCount(payload);

  const rows = new Array<Record<string, CellValue>>(total);
  for (let i = 0; i < total; i++) {
    const row: Record<string, CellValue> = {};
    for (const column of columns) {
      row[column.key] = payload.data[column.key][i] ?? null;
    }
    rows[i] = row;
  }
  return rows;
}

/** A single column, for the code paths that want arrays rather than rows. */
export function column(payload: DatasetPayload, key: string): CellValue[] {
  return payload.data[key] ?? [];
}

/** A numeric column, with gaps preserved as `null`. */
export function numericColumn(
  payload: DatasetPayload,
  key: string,
): (number | null)[] {
  return column(payload, key).map((value) =>
    typeof value === "number" ? value : null,
  );
}

/**
 * Stable JSON for hashing: column order follows `columns`, and object keys are
 * emitted in that same order rather than insertion order. Two imports of the
 * same numbers must produce the same string, or the checksum cannot decide
 * whether anything actually changed.
 */
export function canonicalize(payload: DatasetPayload): string {
  const columns = payload.columns.map((column) => ({
    key: column.key,
    label: column.label,
    type: column.type,
    ...(column.format ? { format: column.format } : {}),
    ...(column.digits !== undefined ? { digits: column.digits } : {}),
    ...(column.unit ? { unit: column.unit } : {}),
  }));
  const data: Record<string, CellValue[]> = {};
  for (const column of payload.columns) {
    data[column.key] = payload.data[column.key] ?? [];
  }
  return JSON.stringify({ columns, data });
}

/**
 * sha256 of the canonical payload, via Web Crypto so this module stays usable
 * from both the server action and the admin client without pulling `node:`
 * builtins into a browser bundle.
 */
export async function canonicalChecksum(
  payload: DatasetPayload,
): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalize(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
