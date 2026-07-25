import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  cumulative,
  formatBps,
  formatUsd,
  formatUsdCompact,
  netCurve,
  netTotal,
  winRateAt,
  type EquityFigure,
} from "@/lib/chart";

const figure = JSON.parse(
  readFileSync(join(process.cwd(), "public/figures/pairs-equity.json"), "utf8"),
) as EquityFigure;

describe("cumulative", () => {
  it("accumulates left to right", () => {
    expect(cumulative([1, 2, 3])).toEqual([1, 3, 6]);
  });

  it("handles an empty series", () => {
    expect(cumulative([])).toEqual([]);
  });
});

describe("netTotal", () => {
  /**
   * These are the numbers the article and the paper state. If the payload is
   * ever regenerated with a different filter or cost model, this test is what
   * catches the figure quietly disagreeing with the prose around it.
   */
  it("reproduces the paper's headline net PnL at 2 bps", () => {
    expect(netTotal(figure.series, 2)).toBeCloseTo(1896.33, 1);
  });

  it("is linear in the fee", () => {
    const at0 = netTotal(figure.series, 0);
    const at4 = netTotal(figure.series, 4);
    const at8 = netTotal(figure.series, 8);
    expect(at0 - at4).toBeCloseTo(at4 - at8, 6);
  });

  it("crosses zero at the stated break-even fee", () => {
    const breakeven = figure.meta.breakevenBps;
    expect(netTotal(figure.series, breakeven)).toBeCloseTo(0, 0);
    expect(netTotal(figure.series, breakeven - 1)).toBeGreaterThan(0);
    expect(netTotal(figure.series, breakeven + 1)).toBeLessThan(0);
  });

  it("agrees with the last point of the curve", () => {
    const curve = netCurve(figure.series, 2);
    expect(curve[curve.length - 1]).toBeCloseTo(netTotal(figure.series, 2), 6);
  });
});

describe("winRateAt", () => {
  it("matches the paper's 81% at the baseline fee", () => {
    expect(winRateAt(figure.winRate, 2)).toBeCloseTo(0.808, 3);
  });

  it("falls as fees rise", () => {
    expect(winRateAt(figure.winRate, 26)).toBeLessThan(
      winRateAt(figure.winRate, 2),
    );
  });

  it("snaps to the nearest grid point outside the range", () => {
    expect(winRateAt(figure.winRate, -5)).toBe(figure.winRate.rate[0]);
    expect(winRateAt(figure.winRate, 999)).toBe(
      figure.winRate.rate[figure.winRate.rate.length - 1],
    );
  });
});

describe("formatting", () => {
  it("formats dollars with a sign and thousands separators", () => {
    expect(formatUsd(1896.33)).toBe("$1,896");
    expect(formatUsd(-1804.6)).toBe("-$1,805");
    expect(formatUsd(0)).toBe("$0");
  });

  // Math.round breaks ties toward +Infinity, so a negative .5 rounds up in
  // magnitude terms rather than away from zero. Pinned because it looks like
  // an off-by-one when read in isolation.
  it("rounds a negative half toward zero", () => {
    expect(formatUsd(-1804.5)).toBe("-$1,804");
  });

  it("compacts axis ticks", () => {
    expect(formatUsdCompact(2000)).toBe("$2k");
    expect(formatUsdCompact(-1500)).toBe("-$1.5k");
    expect(formatUsdCompact(250)).toBe("$250");
  });

  it("drops trailing zeros but keeps real precision", () => {
    expect(formatBps(2)).toBe("2 bps");
    expect(formatBps(14.3)).toBe("14.3 bps");
    expect(formatBps(2.25)).toBe("2.25 bps");
    expect(formatBps(2.5)).toBe("2.5 bps");
  });
});
