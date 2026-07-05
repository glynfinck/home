import { describe, expect, it } from "vitest";

import {
  estimateReadingMinutes,
  formatBytes,
  formatDate,
  slugify,
} from "@/lib/format";

describe("formatDate", () => {
  it("formats an ISO string in UTC (no timezone drift)", () => {
    // Midnight UTC must not slip to the previous day in a negative-offset TZ.
    expect(formatDate("2026-01-05T00:00:00Z")).toBe("Jan 5, 2026");
  });

  it("accepts a Date object", () => {
    expect(formatDate(new Date("2026-07-05T12:00:00Z"))).toBe("Jul 5, 2026");
  });

  it("returns an empty string for empty/nullish input", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("")).toBe("");
  });
});

describe("formatBytes", () => {
  it("returns empty for zero or nullish", () => {
    expect(formatBytes(0)).toBe("");
    expect(formatBytes(null)).toBe("");
    expect(formatBytes(undefined)).toBe("");
    expect(formatBytes(-10)).toBe("");
  });

  it("shows bytes with no decimals below 1 KB", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("switches units on the 1024 boundary with one decimal", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 ** 2)).toBe("1.0 MB");
    expect(formatBytes(1024 ** 3)).toBe("1.0 GB");
  });

  it("clamps to the largest known unit", () => {
    // 1 TB has no unit; it should still render in GB, not overflow the array.
    expect(formatBytes(1024 ** 4)).toBe("1024.0 GB");
  });
});

describe("estimateReadingMinutes", () => {
  it("is at least one minute for any non-empty content", () => {
    expect(estimateReadingMinutes("just a few words")).toBe(1);
    expect(estimateReadingMinutes("")).toBe(1);
  });

  it("estimates ~200 words per minute", () => {
    expect(estimateReadingMinutes("word ".repeat(600))).toBe(3);
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates words", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips diacritics", () => {
    expect(slugify("Héllo Wörld")).toBe("hello-world");
  });

  it("drops punctuation and collapses separators", () => {
    expect(slugify("Momentum: Signal_Decay!! (v2)")).toBe(
      "momentum-signal-decay-v2",
    );
  });

  it("treats underscores as word separators", () => {
    expect(slugify("signal_decay")).toBe("signal-decay");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("  --hi--  ")).toBe("hi");
  });
});
