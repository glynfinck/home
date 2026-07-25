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
import numpy as np
import pandas as pd

PAPER = Path.home() / "Documents/Repositories/Research/ou-pairs-paper"
RESULTS = PAPER / "results"
GOLD = Path.home() / "Documents/Data/gold/ou_pairs"
SILVER = Path.home() / "Documents/Data/silver/kraken_ohlcv_1m"
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






def build_crossover() -> dict:
    """Relative error of each F'/F representation vs a quadrature reference.

    This is the validation of the reformulation the post is built on: the
    exact kernel holds to reference precision until SciPy's `pbdv` dies
    (asymmetrically, by overflow at beta ~ +53 and underflow at ~ -41), and the
    asymptotic forms take over from there.

    Mirrors `fig_crossover` in the paper repo's scripts/build_figures.py; the
    reference is that repo's own overflow-free log-domain quadrature.
    """
    import sys
    import warnings

    sys.path.insert(0, str(PAPER / "scripts"))
    from scipy.special import pbdv  # noqa: PLC0415
    from verify_math import log_integral  # noqa: PLC0415

    a, alpha = 1.5, 0.5
    betas = np.arange(-60.0, 60.5, 0.5)

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        ref = np.array(
            [np.exp(log_integral(alpha + 1, b) - log_integral(alpha, b)) for b in betas]
        )
    with np.errstate(all="ignore"):
        d0, d0p = pbdv(-a, -betas)
        exact = betas / 2 - d0p / d0
    u_star = 0.5 * (betas + np.sqrt(betas**2 + 4 * alpha))
    lam = -betas
    with np.errstate(all="ignore"):
        w0 = a / lam
        w1 = w0 * (1 - (a + 1) / lam**2)

    # Floor at the reference's own precision: below this the curve is measuring
    # the reference, not the approximation.
    FLOOR = 1e-13
    err = lambda approx: np.maximum(np.abs(approx / ref - 1), FLOOR)  # noqa: E731

    def points(values, mask=None):
        """Series points, with non-finite values emitted as null.

        The exact kernel genuinely has no value where pbdv overflows or
        underflows — that gap IS the finding. `null` renders as a break in the
        line; a bare NaN would be invalid JSON and fail JSON.parse outright.
        """
        out = []
        for b, v in zip(betas, values):
            if mask is not None and not mask(b):
                continue
            y = float(v)
            out.append(
                {"x": round(float(b), 2), "y": None if not np.isfinite(y) else round(y, 15)}
            )
        return out

    return {
        "kind": "lines",
        "title": "The crossover is validated, not assumed",
        "caption": (
            "Each F'/F representation against an overflow-free log-domain "
            "quadrature reference (a = 1.5). The exact kernel is good to "
            "reference precision until SciPy's pbdv dies; the asymptotic "
            "fallbacks take over from there. The floor is the reference's own "
            "precision, not a failure."
        ),
        "meta": {"source": "verify_math.py quadrature reference, a = 1.5"},
        "x": {"label": "beta = kappa (x - theta), displacement in units of sigma", "min": -62, "max": 62},
        "y": {"label": "relative error vs reference", "scale": "log", "min": FLOOR, "max": 1e-1},
        "series": [
            {
                "label": "Exact kernel ratio (Prop. 2)",
                "directLabel": "exact kernel",
                "labelAt": 0.78,
                "points": points(err(exact)),
                "colorIndex": 0,
            },
            {
                "label": "Laplace",
                "directLabel": "Laplace",
                "labelAt": 0.45,
                "points": points(err(u_star), mask=lambda b: b >= 8),
                "colorIndex": 2,
            },
            {
                "label": "Watson, leading order",
                "directLabel": "Watson",
                "labelAt": 0.45,
                "points": points(err(w0), mask=lambda b: b <= -8),
                "colorIndex": 1,
            },
            {
                # Same entity at a higher order, so it shares the hue and is
                # distinguished by dash rather than consuming a fourth slot.
                "label": "Watson, 2nd-order correction",
                "directLabel": "+ 2nd order",
                "labelAt": 0.3,
                "points": points(err(w1), mask=lambda b: b <= -8),
                "colorIndex": 1,
                "dash": True,
            },
        ],
        "annotations": [
            # Labels sit on the failing side of each threshold, so they name
            # the region they describe rather than the one that still works.
            {"x": 53.0, "label": "pbdv overflows", "align": "left"},
            {"x": -41.3, "label": "pbdv underflows", "align": "right"},
        ],
    }



# The single round trip the post uses as its worked example. Same trade as
# ANATOMY in the paper repo's build_figures.py, so the figures agree.
ANATOMY = {
    "pair_id": 3409,
    "leg_1": "LINKUSD",
    "leg_2": "ZECUSD",
    "entry_time": "2025-01-14 00:01:00",
}


def build_trade_anatomy() -> dict:
    """One round trip at the computed optimal levels.

    Rebuilds the spread from the two legs' 1-minute closes, then anchors it to
    the trade's recorded entry spread: the stored d*/b*/theta levels live in
    residual space, so without that shift the levels and the series would sit
    on different axes. Resampled to 5 minutes, which is the resolution the
    published figure uses and keeps the payload small.
    """
    con = duckdb.connect()
    trades_file = GOLD / "trades" / f"pair_id={ANATOMY['pair_id']}" / "data.parquet"
    trade = con.sql(
        f"select * from read_parquet('{trades_file}') "
        f"where entry_time = timestamp '{ANATOMY['entry_time']}'"
    ).df()
    if len(trade) != 1:
        raise RuntimeError(f"anatomy trade not unique: {len(trade)} rows")
    tr = trade.iloc[0].to_dict()

    t0 = pd.Timestamp(tr["entry_time"]) - pd.Timedelta(hours=24)
    t1 = pd.Timestamp(tr["exit_time"]) + pd.Timedelta(hours=8)
    frames = {}
    for leg in ("leg_1", "leg_2"):
        path = SILVER / f"symbol={ANATOMY[leg]}" / "data.parquet"
        frames[leg] = con.sql(
            f"""select timestamp, close from read_parquet('{path}')
                where timestamp between timestamp '{t0}' and timestamp '{t1}'
                order by timestamp"""
        ).df()

    df = frames["leg_1"].merge(frames["leg_2"], on="timestamp", suffixes=("_1", "_2"))
    df["raw"] = df["close_1"] - tr["hedge_ratio"] * df["close_2"]
    at_entry = df.loc[
        (df["timestamp"] - pd.Timestamp(tr["entry_time"])).abs().idxmin(), "raw"
    ]
    df["spread"] = df["raw"] - (at_entry - tr["spread_entry"])
    df = (
        df.set_index("timestamp")["spread"]
        .resample("5min")
        .last()
        .dropna()
        .reset_index()
    )

    start = df["timestamp"].iloc[0]
    to_hours = lambda ts: round((pd.Timestamp(ts) - start).total_seconds() / 3600, 3)  # noqa: E731

    return {
        "kind": "lines",
        "title": "One round trip at the Leung-Li optimal levels",
        "caption": (
            f"{ANATOMY['leg_1']} - {tr['hedge_ratio']:.2f} x {ANATOMY['leg_2']}, "
            "January 2025: entry below d*, sixty hours of noise, exit above b*."
        ),
        "meta": {"source": "Kraken spot, 1-min bars resampled to 5 min"},
        "x": {"label": "Hours from start of window"},
        "y": {
            "label": f"Spread ({ANATOMY['leg_1']} - {tr['hedge_ratio']:.2f} x {ANATOMY['leg_2']})",
            "format": "plain",
        },
        "series": [
            {
                "label": "Spread",
                "points": [
                    {"x": to_hours(t), "y": round(float(v), 6)}
                    for t, v in zip(df["timestamp"], df["spread"])
                ],
                "colorIndex": 0,
            }
        ],
        "levels": [
            {"value": round(float(tr["ou_theta_entry"]), 6), "label": "theta (long-run mean)"},
            {"value": round(float(tr["entry_level"]), 6), "label": "optimal entry d*"},
            {"value": round(float(tr["exit_level"]), 6), "label": "optimal exit b*"},
        ],
        "markers": [
            {
                "x": to_hours(tr["entry_time"]),
                "y": round(float(tr["spread_entry"]), 6),
                "label": "enter",
            },
            {
                "x": to_hours(tr["exit_time"]),
                "y": round(float(tr["spread_exit"]), 6),
                "label": "exit",
            },
        ],
    }


def main() -> None:
    results = json.loads((RESULTS / "paper_results.json").read_text())
    OUT.mkdir(parents=True, exist_ok=True)

    for name, payload in [
        ("pairs-equity.json", build_equity(results)),
        ("pairs-volume-rank.json", build_liquidity_ladder(results)),
        ("pairs-crossover.json", build_crossover()),
        ("pairs-trade-anatomy.json", build_trade_anatomy()),
    ]:
        path = OUT / name
        path.write_text(
            json.dumps(payload, separators=(",", ":"), allow_nan=False) + "\n"
        )
        print(f"wrote {path.name} ({path.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
