import { describe, expect, it } from "vitest";

import { bibtex } from "@/lib/citation";
import { formatMonthDay, yearOf } from "@/lib/format";
import { parseHighlights } from "@/lib/highlights";
import { OU, simulateOu } from "@/lib/ou";
import { plateKind, plateShapes } from "@/lib/plate";
import { profileFacts, profileSettingsSchema } from "@/lib/settings";

describe("parseHighlights", () => {
  it("reads a well-formed list and defaults the tone", () => {
    expect(parseHighlights([{ label: "Pairs", value: "4,950" }])).toEqual([
      { label: "Pairs", value: "4,950", tone: "neutral" },
    ]);
  });

  it("treats anything malformed as no highlights rather than throwing", () => {
    expect(parseHighlights(null)).toEqual([]);
    expect(parseHighlights(undefined)).toEqual([]);
    expect(parseHighlights({ label: "x" })).toEqual([]);
    expect(parseHighlights([{ label: "", value: "1" }])).toEqual([]);
    expect(
      parseHighlights(
        Array.from({ length: 5 }, () => ({ label: "a", value: "1" })),
      ),
    ).toEqual([]);
  });
});

describe("bibtex", () => {
  it("formats a self-published paper as @misc with a stable key", () => {
    expect(
      bibtex({
        author: "Glyn Finck",
        title: "Pairs & Limits",
        slug: "ou-pairs-limits-of-arbitrage",
        publishedAt: "2026-07-14T09:00:00Z",
        siteUrl: "https://glyn.dev/",
      }),
    ).toBe(
      [
        "@misc{finck2026oupairs,",
        "  author = {Finck, Glyn},",
        "  title  = {Pairs \\& Limits},",
        "  year   = {2026},",
        "  url    = {https://glyn.dev/research/ou-pairs-limits-of-arbitrage}",
        "}",
      ].join("\n"),
    );
  });

  it("leaves the year out when the paper has no date", () => {
    const entry = bibtex({
      author: "Glyn Finck",
      title: "T",
      slug: "a-b",
      publishedAt: null,
      siteUrl: "https://glyn.dev",
    });
    expect(entry).not.toContain("year");
    expect(entry.startsWith("@misc{fincka")).toBe(true);
  });
});

describe("log dates", () => {
  it("zero-pads the day so the gutter is one width", () => {
    expect(formatMonthDay("2026-07-06T00:00:00Z")).toBe("Jul 06");
    expect(yearOf("2026-07-06T00:00:00Z")).toBe("2026");
    expect(formatMonthDay(null)).toBe("");
    expect(yearOf(null)).toBe("");
  });
});

describe("simulateOu", () => {
  it("is reproducible from its seed", () => {
    expect(simulateOu(4821)).toEqual(simulateOu(4821));
    expect(simulateOu(4821).path).not.toEqual(simulateOu(4822).path);
  });

  it("alternates entries and exits, entering below d* and exiting above b*", () => {
    const { path, trades } = simulateOu(4821);
    expect(path).toHaveLength(OU.steps);
    trades.forEach((trade, i) => {
      expect(trade.kind).toBe(i % 2 === 0 ? "enter" : "exit");
      if (trade.kind === "enter")
        expect(path[trade.step]).toBeLessThan(OU.entry);
      else expect(path[trade.step]).toBeGreaterThan(OU.exit);
    });
  });
});

describe("project plates", () => {
  const project = (title: string, summary = "", tech_stack: string[] = []) => ({
    slug: title.toLowerCase().replace(/\s+/g, "-"),
    title,
    summary,
    tech_stack,
  });

  it("picks the plate from the project's subject", () => {
    expect(plateKind(project("Graph Editor", "write a traversal"))).toBe(
      "graph",
    );
    expect(
      plateKind(project("Robot", "maps and navigates offices", ["SLAM"])),
    ).toBe("map");
    expect(plateKind(project("CALVIN", "A robot that follows tape"))).toBe(
      "line",
    );
  });

  it("matches whole words, so a pipeline is not a line follower", () => {
    expect(plateKind(project("ETL", "a data pipeline"))).not.toBe("line");
  });

  it("draws the same plate for the same project every time", () => {
    expect(plateShapes("graph", "graph-editor")).toEqual(
      plateShapes("graph", "graph-editor"),
    );
    for (const kind of [
      "graph",
      "map",
      "line",
      "wave",
      "blocks",
      "page",
    ] as const) {
      expect(plateShapes(kind, "seed").length).toBeGreaterThan(0);
    }
  });
});

describe("profileFacts", () => {
  it("uses the configured facts when there are any", () => {
    const profile = profileSettingsSchema.parse({
      facts: [{ key: "role", value: "Engineer" }],
    });
    expect(profileFacts(profile)).toEqual([{ key: "role", value: "Engineer" }]);
  });

  it("falls back to the fields the profile has, skipping empty ones", () => {
    const profile = profileSettingsSchema.parse({ location: "London" });
    expect(profileFacts(profile)).toEqual([
      { key: "name", value: "Glyn Finck" },
      { key: "based", value: "London" },
    ]);
  });
});
