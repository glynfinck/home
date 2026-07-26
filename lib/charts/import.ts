import {
  columnDefSchema,
  type CellValue,
  type ColumnDef,
  type ColumnType,
  type DatasetPayload,
} from "@/lib/charts/dataset";

/**
 * File to dataset payload.
 *
 * Four input shapes, one output shape. CSV and TSV cover anything that fell
 * out of a spreadsheet or a pandas `to_csv`; the three JSON shapes cover
 * anything a generator script emits without making it reshape first.
 *
 * Parsing is hand-rolled rather than delegated. RFC 4180 is a page long, the
 * files are kilobytes, and a dependency here would have to be trusted with
 * every figure on the site.
 */

export const IMPORT_ACCEPT = ".csv,.tsv,.json,.ndjson,.jsonl,text/csv,application/json";

/** A parsed file, before the admin has confirmed the column mapping. */
export type ImportDraft = {
  columns: ColumnDef[];
  data: Record<string, CellValue[]>;
  rowCount: number;
  /** Non-fatal notes worth showing next to the preview grid. */
  warnings: string[];
};

/* ------------------------------ delimited ------------------------------- */

/**
 * RFC 4180 reader. Handles quoted fields, escaped quotes (`""`), embedded
 * newlines and commas, and both CRLF and LF line endings.
 */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;

  // A BOM ahead of the first header would otherwise become part of its name.
  if (text.charCodeAt(0) === 0xfeff) i = 1;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    // Trailing newline at end of file must not produce a phantom empty row.
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }

    if (char === '"' && field === "") {
      quoted = true;
      i++;
      continue;
    }
    if (char === delimiter) {
      pushField();
      i++;
      continue;
    }
    if (char === "\r") {
      i++;
      continue;
    }
    if (char === "\n") {
      pushRow();
      i++;
      continue;
    }

    field += char;
    i++;
  }

  if (field !== "" || row.length > 0) pushRow();
  return rows;
}

/** Comma or tab, whichever appears more often in the first line. */
export function detectDelimiter(text: string): string {
  const line = text.slice(0, text.indexOf("\n") + 1 || text.length);
  const commas = (line.match(/,/g) ?? []).length;
  const tabs = (line.match(/\t/g) ?? []).length;
  return tabs > commas ? "\t" : ",";
}

/* ------------------------------ inference ------------------------------- */

const INTEGER = /^-?\d+$/;
const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;
const DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z?)?$/;
const BOOLEAN = /^(?:true|false)$/i;

/** Values that mean "no observation here" in a hand-edited file. */
const BLANK = new Set(["", "na", "n/a", "nan", "null", "none", "-"]);

function isBlank(value: string): boolean {
  return BLANK.has(value.trim().toLowerCase());
}

/**
 * Column type from the values, narrowest first.
 *
 * Blanks never decide a type: a column of integers with three gaps is still an
 * integer column. A column that is entirely blank falls back to `string`,
 * which is the only choice that cannot silently coerce later.
 */
export function inferType(values: string[]): ColumnType {
  const present = values.filter((value) => !isBlank(value));
  if (present.length === 0) return "string";

  if (present.every((value) => INTEGER.test(value.trim()))) return "integer";
  if (present.every((value) => NUMBER.test(value.trim()))) return "number";
  if (present.every((value) => DATE.test(value.trim()))) return "date";
  if (present.every((value) => BOOLEAN.test(value.trim()))) return "boolean";
  return "string";
}

/** `Gross PnL ($)` -> `gross_pnl`. Always a legal column key. */
export function toColumnKey(header: string, index: number): string {
  const key = header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");

  if (!key) return `column_${index + 1}`;
  // Keys must start with a letter to stay safe as expression references.
  return /^[a-z]/.test(key) ? key : `column_${key}`;
}

/** Cast a raw string to the column's type. Unparseable becomes a gap. */
export function castValue(raw: string, type: ColumnType): CellValue {
  const value = raw.trim();
  if (isBlank(value)) return null;

  switch (type) {
    case "integer":
    case "number": {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    case "boolean":
      return value.toLowerCase() === "true";
    case "date":
    case "string":
      return value;
  }
}

/* -------------------------------- entry --------------------------------- */

function draftFromRecords(records: Record<string, unknown>[]): ImportDraft {
  const warnings: string[] = [];
  // Union of keys across all records, not just the first: a generator that
  // omits null fields would otherwise lose columns.
  const headers: string[] = [];
  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (!headers.includes(key)) headers.push(key);
    }
  }

  const raw = headers.map((header) =>
    records.map((record) => {
      const value = record[header];
      return value === null || value === undefined ? "" : String(value);
    }),
  );

  return buildDraft(headers, raw, warnings);
}

function buildDraft(
  headers: string[],
  rawColumns: string[][],
  warnings: string[],
): ImportDraft {
  const columns: ColumnDef[] = [];
  const data: Record<string, CellValue[]> = {};
  const seen = new Set<string>();

  headers.forEach((header, index) => {
    let key = toColumnKey(header, index);
    if (seen.has(key)) {
      const collision = key;
      let suffix = 2;
      while (seen.has(`${collision}_${suffix}`)) suffix++;
      key = `${collision}_${suffix}`;
      warnings.push(`Renamed duplicate column "${header}" to "${key}"`);
    }
    seen.add(key);

    const values = rawColumns[index] ?? [];
    const type = inferType(values);
    const label = header.trim() || key;

    columns.push({ key, label, type });
    data[key] = values.map((value) => castValue(value, type));
  });

  return {
    columns,
    data,
    rowCount: rawColumns[0]?.length ?? 0,
    warnings,
  };
}

/**
 * Parse an uploaded file into a draft payload.
 *
 * Throws with a readable message rather than returning a partial result: an
 * import that half-worked is worse than one that refused, because the half
 * that worked gets published.
 */
export function parseImport(text: string, fileName: string): ImportDraft {
  const name = fileName.toLowerCase();
  const trimmed = text.trim();

  if (!trimmed) throw new Error("The file is empty");

  if (name.endsWith(".ndjson") || name.endsWith(".jsonl")) {
    const records = trimmed
      .split("\n")
      .filter((line) => line.trim())
      .map((line, index) => {
        try {
          return JSON.parse(line) as Record<string, unknown>;
        } catch {
          throw new Error(`Line ${index + 1} is not valid JSON`);
        }
      });
    return draftFromRecords(records);
  }

  if (name.endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error("The file is not valid JSON");
    }

    if (Array.isArray(parsed)) {
      if (parsed.length === 0) throw new Error("The file has no rows");
      if (typeof parsed[0] !== "object" || parsed[0] === null) {
        throw new Error("Expected an array of objects, one per row");
      }
      return draftFromRecords(parsed as Record<string, unknown>[]);
    }

    if (parsed && typeof parsed === "object") {
      // Columnar: `{ "day": [...], "gross": [...] }`. Also accepts a payload
      // that already has our shape, in which case `data` is unwrapped first.
      const source = (
        "data" in parsed && typeof (parsed as { data: unknown }).data === "object"
          ? (parsed as { data: Record<string, unknown> }).data
          : parsed
      ) as Record<string, unknown>;

      const headers = Object.keys(source).filter((key) =>
        Array.isArray(source[key]),
      );
      if (headers.length === 0) {
        throw new Error("Expected an array of rows or an object of columns");
      }
      const rawColumns = headers.map((header) =>
        (source[header] as unknown[]).map((value) =>
          value === null || value === undefined ? "" : String(value),
        ),
      );
      return buildDraft(headers, rawColumns, []);
    }

    throw new Error("Expected an array of rows or an object of columns");
  }

  const rows = parseDelimited(text, detectDelimiter(text));
  if (rows.length < 2) throw new Error("Expected a header row and at least one data row");

  const [headers, ...body] = rows;
  const warnings: string[] = [];
  const width = headers.length;

  const ragged = body.filter((row) => row.length !== width).length;
  if (ragged > 0) {
    warnings.push(
      `${ragged} row${ragged === 1 ? "" : "s"} did not have ${width} fields; missing fields were read as gaps`,
    );
  }

  const rawColumns = headers.map((_, index) => body.map((row) => row[index] ?? ""));
  return buildDraft(headers, rawColumns, warnings);
}

/** Apply the admin's column edits to a draft, producing a storable payload. */
export function draftToPayload(
  draft: ImportDraft,
  columns: ColumnDef[],
): DatasetPayload {
  const data: Record<string, CellValue[]> = {};

  for (const column of columns) {
    columnDefSchema.parse(column);
    const source = draft.data[column.key];
    if (!source) throw new Error(`Column "${column.key}" is not in the file`);

    // Retyping in the mapping grid re-casts from the parsed values rather than
    // from the original text, so "1.5" typed as integer lands as 1.5, not 1.
    data[column.key] =
      column.type === draft.columns.find((c) => c.key === column.key)?.type
        ? source
        : source.map((value) =>
            value === null ? null : castValue(String(value), column.type),
          );
  }

  return { columns, data };
}
