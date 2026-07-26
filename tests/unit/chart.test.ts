import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  formatBps,
  formatNumber,
  formatPercent,
  formatSci,
  formatUsd,
  formatUsdCompact,
  netTotal,
  winRateAt,
} from "@/lib/chart";
import { datasetPayloadSchema } from "@/lib/charts/dataset";

/**
 * The numbers the article and the paper state.
 *
 * Read from the committed fixture rather than the database so this stays a
 * unit test. The fixture is the same payload the seed loads, so if the data is
 * ever regenerated with a different filter or cost model, this is what catches
 * the figure quietly disagreeing with the prose around it.
 */
const fixture = datasetPayloadSchema.parse(
  JSON.parse(
    readFileSync(
      join(process.cwd(), "tests/fixtures/pairs-equity-daily.json"),
      "utf8",
    ),
  ),
);

const series = {
  gross: fixture.data.gross as number[],
  turnover: fixture.data.turnover as number[],
};

const winRate = JSON.parse(
  readFileSync(
    join(process.cwd(), "tests/fixtures/pairs-winrate-grid.json"),
    "utf8",
  ),
) as { bps: number[]; rate: number[] };

describe("netTotal", () => {
  it("reproduces the paper's headline net PnL at 2 bps", () => {
    expect(netTotal(series, 2)).toBeCloseTo(1896.33, 1);
  });

  it("is linear in the fee", () => {
    // The whole interactive figure rests on this: if net were not affine in
    // the fee, every slider position would need its own precomputed curve.
    const a = netTotal(series, 0);
    const b = netTotal(series, 10);
    const c = netTotal(series, 20);
    expect(b - a).toBeCloseTo(c - b, 6);
  });

  it("crosses zero at the paper's break-even fee", () => {
    const breakeven = 14.3;
    expect(netTotal(series, breakeven)).toBeCloseTo(0, 0);
    expect(netTotal(series, breakeven - 1)).toBeGreaterThan(0);
    expect(netTotal(series, breakeven + 1)).toBeLessThan(0);
  });
});

describe("winRateAt", () => {
  it("reports the paper's win rate at 2 bps", () => {
    expect(winRateAt(winRate, 2)).toBeCloseTo(0.808, 2);
  });

  it("falls as the fee rises", () => {
    expect(winRateAt(winRate, 24)).toBeLessThan(winRateAt(winRate, 2));
  });

  it("clamps outside the grid rather than extrapolating", () => {
    expect(winRateAt(winRate, -5)).toBe(winRateAt(winRate, 0));
    expect(winRateAt(winRate, 1000)).toBe(
      winRateAt(winRate, winRate.bps[winRate.bps.length - 1]),
    );
  });

  it("returns zero for an empty grid", () => {
    expect(winRateAt({ bps: [], rate: [] }, 2)).toBe(0);
  });
});

describe("formatters", () => {
  it("formats dollars with the sign ahead of the symbol", () => {
    // `-$1,496`, never `$-1,496`: the figure has to read like the prose.
    expect(formatUsd(1896.33)).toBe("$1,896");
    expect(formatUsd(-1496.4)).toBe("-$1,496");
    expect(formatUsd(0)).toBe("$0");
  });

  it("compacts thousands for axis ticks", () => {
    expect(formatUsdCompact(2000)).toBe("$2k");
    expect(formatUsdCompact(-1500)).toBe("-$1.5k");
    expect(formatUsdCompact(-250)).toBe("-$250");
  });

  it("strips trailing zeros from basis points", () => {
    expect(formatBps(2)).toBe("2 bps");
    expect(formatBps(14.3)).toBe("14.3 bps");
    expect(formatBps(2.25)).toBe("2.25 bps");
  });

  it("formats percentages and plain numbers", () => {
    expect(formatPercent(0.808)).toBe("80.8%");
    expect(formatNumber(-1.06)).toBe("-1.1");
  });

  it("formats decades for a log axis", () => {
    expect(formatSci(1e-13)).toBe("1e-13");
    expect(formatSci(0)).toBe("0");
  });
});
