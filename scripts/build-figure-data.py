#!/usr/bin/env python3
"""Build the interactive figure payloads for the pairs-trading post.

Source of truth is the paper repo's own results, so the interactive figures
reproduce the published ones rather than a parallel re-derivation:

    ~/Documents/Repositories/Research/ou-pairs-paper/results/
        paper_results.json          headline numbers + liquidity ladder buckets
        equity_curves_daily.csv     the three published equity curves

Run it with either project's venv (both have pandas/duckdb):

    ~/Documents/Repositories/Research/ou-pairs-paper/.venv/bin/python \
        scripts/build-figure-data.py

## Why the slider is exact

The published CSV carries three baked curves at 2, 14 and 24 bps. Net PnL is
linear in the fee,

    net(f) = gross - f * turnover - borrow

so two curves are enough to recover cumulative turnover and (gross - borrow)
per day:

    turnover = (net(a) - net(b)) / (b - a)

Reconstructing the third curve from the other two agrees to ~9e-12, which is
the check that the decomposition is sound. Every slider position is then an
exact evaluation of that identity, not an interpolation between the three
published lines.

## Win rate

Win rate is NOT linear in the fee, so it cannot come from the daily buckets.
It is computed per trade from the gold layer and shipped as a dense grid.
`End of Data` exits are excluded, which is what reproduces the paper's 38,241
trades and $1,896 net.
"""

from __future__ import annotations

import json
from pathlib import Path

import duckdb
import pandas as pd

PAPER = Path.home() / "Documents/Repositories/Research/ou-pairs-paper"
RESULTS = PAPER / "results"
GOLD = Path.home() / "Documents/Data/gold/ou_pairs"
TRADES = f"{GOLD}/trades/**/*.parquet"
OUT = Path(__file__).resolve().parent.parent / "public/figures"

FEE_MAX_BPS = 30.0
FEE_STEP_BPS = 0.25


def build_equity(results: dict) -> dict:
    headline = results["headline"]
    meta = results["meta"]

    as_run_bps = headline["as_run_2bps"]["fee_rate_per_side"] * 10_000
    maker_bps = headline["kraken_maker_50k_tier"]["fee_rate_per_side"] * 10_000
    taker_bps = headline["kraken_taker_50k_tier"]["fee_rate_per_side"] * 10_000
    breakeven_bps = results["headline"]["break_even_fee_per_side"] * 10_000

    df = pd.read_csv(RESULTS / "equity_curves_daily.csv", parse_dates=["exit_time"])
    a, b = as_run_bps / 10_000, taker_bps / 10_000

    cum_turnover = (
        df["cum_net_as_run_2bps"] - df["cum_net_kraken_taker_50k_tier"]
    ) / (b - a)
    cum_gross_less_borrow = df["cum_net_as_run_2bps"] + a * cum_turnover

    # Verify against the curve NOT used to derive the decomposition. If this
    # ever drifts, the payload and the paper have diverged.
    residual = (
        (cum_gross_less_borrow - (maker_bps / 10_000) * cum_turnover)
        - df["cum_net_kraken_maker_50k_tier"]
    ).abs().max()
    assert residual < 1e-6, f"decomposition disagrees with the maker curve: {residual}"

    # Per-day deltas; the client re-accumulates so it can rescale on the fly.
    daily_turnover = cum_turnover.diff().fillna(cum_turnover.iloc[0])
    daily_gross_less_borrow = cum_gross_less_borrow.diff().fillna(
        cum_gross_less_borrow.iloc[0]
    )

    start = df["exit_time"].iloc[0]

    con = duckdb.connect()
    grid = con.sql(
        f"""
        WITH t AS (
          SELECT
            short_gross_pnl + long_gross_pnl AS gross,
            short_borrow_cost AS borrow,
            long_position_size * (long_entry_price + long_exit_price)
              + short_position_size * (short_entry_price + short_exit_price) AS turnover
          FROM read_parquet('{TRADES}', hive_partitioning=true)
          WHERE exit_reason <> 'End of Data'
        ),
        f AS (
          SELECT unnest(generate_series(0, {int(FEE_MAX_BPS / FEE_STEP_BPS)}))
                 * {FEE_STEP_BPS} AS bps
        )
        SELECT f.bps,
               avg(CASE WHEN t.gross - t.turnover * f.bps / 10000.0 - t.borrow > 0
                        THEN 1.0 ELSE 0.0 END) AS win_rate
        FROM t CROSS JOIN f GROUP BY f.bps ORDER BY f.bps
        """
    ).df()

    return {
        "kind": "equity",
        "title": "Cumulative net PnL",
        "caption": (
            "Every completed round trip, bucketed by exit date. Drag the fee "
            "slider to re-price the same trades at any cost assumption."
        ),
        "meta": {
            "trades": meta["n_trades"],
            "pairs": meta["n_pairs_with_trades"],
            "universePairs": meta["n_universe_pairs"],
            "start": str(start.date()),
            "end": str(df["exit_time"].iloc[-1].date()),
            "grossPnl": headline["as_run_2bps"]["gross_pnl"],
            "turnover": round(float(cum_turnover.iloc[-1]), 2),
            "borrowCost": headline["as_run_2bps"]["borrow_cost"],
            "breakevenBps": round(breakeven_bps, 2),
            "source": "Kraken spot, 1-min bars, Dec 2024 – Dec 2025",
        },
        "fee": {
            "unit": "bps",
            "min": 0,
            "max": FEE_MAX_BPS,
            "step": FEE_STEP_BPS,
            "default": as_run_bps,
            "label": "Fee per side",
        },
        # Named fee levels from the paper, so the presets can never drift from
        # the tiers the article discusses.
        "presets": [
            {"label": "As assumed", "bps": round(as_run_bps, 2)},
            {"label": "Break-even", "bps": round(breakeven_bps, 2)},
            {"label": "Kraken maker", "bps": round(maker_bps, 2)},
            {"label": "Kraken taker", "bps": round(taker_bps, 2)},
        ],
        "series": {
            "start": str(start.date()),
            "day": [int((d - start).days) for d in df["exit_time"]],
            # `gross` here is gross LESS borrow: the whole fee-independent
            # part of the day. Borrow is therefore already accounted for and
            # is not shipped separately. Per-day trade counts aren't in the
            # published CSV, so the tooltip omits them.
            "gross": [round(float(v), 4) for v in daily_gross_less_borrow],
            "turnover": [round(float(v), 2) for v in daily_turnover],
        },
        "winRate": {
            "bps": [round(float(v), 2) for v in grid["bps"]],
            "rate": [round(float(v), 4) for v in grid["win_rate"]],
        },
    }


def build_liquidity_ladder(results: dict) -> dict:
    """The published liquidity ladder, bucket-for-bucket.

    Uneven buckets (2-10, 11-15, 16-25, 26-50, 51-100) rather than deciles,
    matching scripts/build_figures.py in the paper repo. The top bucket is the
    $1,823 figure the article's prose and alt text both quote.
    """
    rows = results["liquidity_ladder_buckets"]
    labels = {
        "2-10": "2–10 (majors)",
        "51-100": "51–100 (illiquid tail)",
    }

    return {
        "kind": "bar",
        "title": "Gross edge lives exactly where it cannot be traded",
        "caption": (
            "Gross PnL by the less-liquid leg's 1-year volume rank. Rank 2 is "
            "the highest-volume symbol traded; the profit concentrates in the "
            "thin tail, where spreads and capacity put it out of reach."
        ),
        "meta": {"source": "Kraken spot, 1-min bars, Dec 2024 – Dec 2025"},
        "x": {
            "label": "Volume rank of the less-liquid leg",
            "values": [labels.get(r["bucket"], r["bucket"]) for r in rows],
        },
        "series": [
            {"label": "Gross PnL", "values": [r["gross_pnl"] for r in rows]},
            {"label": "Net PnL at 2 bps", "values": [r["net_pnl_as_run"] for r in rows]},
        ],
        "trades": [r["n_trades"] for r in rows],
    }


def main() -> None:
    results = json.loads((RESULTS / "paper_results.json").read_text())
    OUT.mkdir(parents=True, exist_ok=True)

    for name, payload in [
        ("pairs-equity.json", build_equity(results)),
        ("pairs-volume-rank.json", build_liquidity_ladder(results)),
    ]:
        path = OUT / name
        path.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
        print(f"wrote {path.name} ({path.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
