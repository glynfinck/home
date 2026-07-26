import { describe, expect, it } from "vitest";

import {
  canonicalChecksum,
  datasetPayloadSchema,
  numericColumn,
  rowCount,
  toRows,
} from "@/lib/charts/dataset";
import {
  castValue,
  detectDelimiter,
  draftToPayload,
  inferType,
  parseDelimited,
  parseImport,
  toColumnKey,
} from "@/lib/charts/import";

describe("parseDelimited", () => {
  it("reads quoted fields containing the delimiter", () => {
    expect(parseDelimited('a,b\n"one, two",3\n', ",")).toEqual([
      ["a", "b"],
      ["one, two", "3"],
    ]);
  });

  it("unescapes doubled quotes", () => {
    expect(parseDelimited('a\n"he said ""hi"""\n', ",")).toEqual([
      ["a"],
      ['he said "hi"'],
    ]);
  });

  it("keeps newlines inside quoted fields", () => {
    expect(parseDelimited('a,b\n"line\nbreak",2\n', ",")).toEqual([
      ["a", "b"],
      ["line\nbreak", "2"],
    ]);
  });

  it("handles CRLF and a missing trailing newline", () => {
    expect(parseDelimited("a,b\r\n1,2", ",")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("does not invent a row from a trailing newline", () => {
    expect(parseDelimited("a\n1\n", ",")).toHaveLength(2);
  });

  it("strips a BOM from the first header", () => {
    expect(parseDelimited("﻿a,b\n1,2\n", ",")[0]).toEqual(["a", "b"]);
  });
});

describe("detectDelimiter", () => {
  it("prefers whichever separator the header actually uses", () => {
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
  });
});

describe("inferType", () => {
  it("narrows to the tightest type the values allow", () => {
    expect(inferType(["1", "2", "-3"])).toBe("integer");
    expect(inferType(["1.5", "2", "1e-9"])).toBe("number");
    expect(inferType(["2024-12-01", "2025-01-31"])).toBe("date");
    expect(inferType(["true", "FALSE"])).toBe("boolean");
    expect(inferType(["a", "1"])).toBe("string");
  });

  it("ignores gaps when deciding", () => {
    // A numeric column with holes is still numeric; treating it as text would
    // silently turn a plottable series into categories.
    expect(inferType(["1", "", "3", "NA", "null"])).toBe("integer");
  });

  it("falls back to string for an entirely empty column", () => {
    expect(inferType(["", "  ", "n/a"])).toBe("string");
  });
});

describe("toColumnKey", () => {
  it("produces a legal identifier from any header", () => {
    expect(toColumnKey("Gross PnL ($)", 0)).toBe("gross_pnl");
    expect(toColumnKey("2024 total", 0)).toBe("column_2024_total");
    expect(toColumnKey("   ", 3)).toBe("column_4");
  });
});

describe("castValue", () => {
  it("turns blanks into gaps rather than zeros", () => {
    expect(castValue("", "number")).toBeNull();
    expect(castValue("NA", "number")).toBeNull();
    // Zero would be a plotted point that never happened.
    expect(castValue("0", "number")).toBe(0);
  });

  it("returns a gap for unparseable numbers", () => {
    expect(castValue("twelve", "number")).toBeNull();
  });
});

describe("parseImport", () => {
  it("reads a CSV into typed columns", () => {
    const draft = parseImport("Day,Gross PnL\n0,1.5\n1,\n2,-3\n", "daily.csv");

    expect(draft.columns.map((column) => column.key)).toEqual([
      "day",
      "gross_pnl",
    ]);
    expect(draft.columns[0].type).toBe("integer");
    expect(draft.columns[1].label).toBe("Gross PnL");
    expect(draft.data.gross_pnl).toEqual([1.5, null, -3]);
    expect(draft.rowCount).toBe(3);
  });

  it("reads an array of row objects", () => {
    const draft = parseImport('[{"x":1,"y":2},{"x":3,"y":4}]', "rows.json");
    expect(draft.data.x).toEqual([1, 3]);
  });

  it("takes the union of keys across rows", () => {
    // A generator that omits null fields would otherwise lose a column.
    const draft = parseImport('[{"x":1},{"x":2,"y":9}]', "rows.json");
    expect(draft.columns.map((c) => c.key)).toEqual(["x", "y"]);
    expect(draft.data.y).toEqual([null, 9]);
  });

  it("reads a columnar object, and unwraps our own payload shape", () => {
    expect(parseImport('{"x":[1,2],"y":[3,4]}', "cols.json").data.x).toEqual([
      1, 2,
    ]);
    expect(
      parseImport('{"columns":[],"data":{"x":[5,6]}}', "payload.json").data.x,
    ).toEqual([5, 6]);
  });

  it("reads NDJSON", () => {
    const draft = parseImport('{"x":1}\n{"x":2}\n', "rows.ndjson");
    expect(draft.data.x).toEqual([1, 2]);
  });

  it("renames duplicate headers instead of losing a column", () => {
    const draft = parseImport("a,a\n1,2\n", "dupe.csv");
    expect(draft.columns.map((c) => c.key)).toEqual(["a", "a_2"]);
    expect(draft.warnings.length).toBeGreaterThan(0);
  });

  it("reports ragged rows rather than silently misaligning them", () => {
    const draft = parseImport("a,b\n1,2\n3\n", "ragged.csv");
    expect(draft.warnings.join(" ")).toMatch(/did not have 2 fields/);
    expect(draft.data.b).toEqual([2, null]);
  });

  it("refuses input it cannot turn into a table", () => {
    expect(() => parseImport("", "empty.csv")).toThrow(/empty/);
    expect(() => parseImport("just a header\n", "one.csv")).toThrow(/header row/);
    expect(() => parseImport("{oops", "bad.json")).toThrow(/valid JSON/);
  });
});

describe("payload schema", () => {
  const valid = {
    columns: [
      { key: "x", label: "X", type: "integer" as const },
      { key: "y", label: "Y", type: "number" as const },
    ],
    data: { x: [1, 2], y: [1.5, null] },
  };

  it("accepts a well-formed payload", () => {
    expect(datasetPayloadSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects ragged columns", () => {
    // The failure this prevents is a chart that renders and is quietly wrong.
    const result = datasetPayloadSchema.safeParse({
      ...valid,
      data: { x: [1, 2, 3], y: [1] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a column with no data and data with no column", () => {
    expect(
      datasetPayloadSchema.safeParse({ columns: valid.columns, data: { x: [1] } })
        .success,
    ).toBe(false);
    expect(
      datasetPayloadSchema.safeParse({
        columns: [valid.columns[0]],
        data: { x: [1], y: [2] },
      }).success,
    ).toBe(false);
  });

  it("rejects a key that is not a safe field reference", () => {
    expect(
      datasetPayloadSchema.safeParse({
        columns: [{ key: "2x", label: "X", type: "integer" }],
        data: { "2x": [1] },
      }).success,
    ).toBe(false);
  });
});

describe("payload helpers", () => {
  const payload = datasetPayloadSchema.parse({
    columns: [
      { key: "x", label: "X", type: "integer" },
      { key: "y", label: "Y", type: "number" },
    ],
    data: { x: [1, 2], y: [1.5, null] },
  });

  it("materialises rows, preserving gaps", () => {
    expect(toRows(payload)).toEqual([
      { x: 1, y: 1.5 },
      { x: 2, y: null },
    ]);
  });

  it("narrows to the requested columns", () => {
    expect(toRows(payload, ["x"])).toEqual([{ x: 1 }, { x: 2 }]);
  });

  it("counts rows and reads numeric columns", () => {
    expect(rowCount(payload)).toBe(2);
    expect(numericColumn(payload, "y")).toEqual([1.5, null]);
  });
});

describe("canonicalChecksum", () => {
  it("is stable across key order, so identical data is not re-imported", async () => {
    const a = datasetPayloadSchema.parse({
      columns: [
        { key: "x", label: "X", type: "integer" },
        { key: "y", label: "Y", type: "integer" },
      ],
      data: { x: [1], y: [2] },
    });
    const b = datasetPayloadSchema.parse({
      columns: [
        { key: "x", label: "X", type: "integer" },
        { key: "y", label: "Y", type: "integer" },
      ],
      // Same data, different insertion order.
      data: { y: [2], x: [1] },
    });

    expect(await canonicalChecksum(a)).toBe(await canonicalChecksum(b));
  });

  it("changes when a value changes", async () => {
    const base = datasetPayloadSchema.parse({
      columns: [{ key: "x", label: "X", type: "integer" }],
      data: { x: [1] },
    });
    const changed = datasetPayloadSchema.parse({
      columns: [{ key: "x", label: "X", type: "integer" }],
      data: { x: [2] },
    });

    expect(await canonicalChecksum(base)).not.toBe(
      await canonicalChecksum(changed),
    );
  });

  it("changes when only a label changes", async () => {
    // Labels are rendered in the data table, so they are part of the payload.
    const base = datasetPayloadSchema.parse({
      columns: [{ key: "x", label: "X", type: "integer" }],
      data: { x: [1] },
    });
    const relabelled = datasetPayloadSchema.parse({
      columns: [{ key: "x", label: "Day", type: "integer" }],
      data: { x: [1] },
    });

    expect(await canonicalChecksum(base)).not.toBe(
      await canonicalChecksum(relabelled),
    );
  });
});

describe("draftToPayload", () => {
  it("re-casts a column the admin retyped", () => {
    const draft = parseImport("a\n1\n2\n", "n.csv");
    expect(draft.columns[0].type).toBe("integer");

    const payload = draftToPayload(draft, [
      { key: "a", label: "A", type: "string" },
    ]);
    expect(payload.data.a).toEqual(["1", "2"]);
  });

  it("drops columns the admin removed", () => {
    const draft = parseImport("a,b\n1,2\n", "n.csv");
    const payload = draftToPayload(draft, [
      { key: "b", label: "B", type: "integer" },
    ]);
    expect(Object.keys(payload.data)).toEqual(["b"]);
  });
});
