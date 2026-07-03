-- =============================================================================
-- glyn.dev — local development seed data
-- =============================================================================

-- Site settings ---------------------------------------------------------------
insert into public.site_settings (key, value) values
  (
    'profile',
    jsonb_build_object(
      'name', 'Glyn Finck',
      'headline', 'Software engineer & quant researcher.',
      'bio', 'I build trading systems and data infrastructure, and write about quantitative finance, markets, and software engineering.',
      'location', 'Canada',
      'email', 'glynfinck@gmail.com',
      'resume_url', ''
    )
  ),
  (
    'social_links',
    jsonb_build_array(
      jsonb_build_object('label', 'GitHub', 'url', 'https://github.com/glynfinck', 'icon', 'github'),
      jsonb_build_object('label', 'LinkedIn', 'url', 'https://www.linkedin.com/in/glynfinck', 'icon', 'linkedin'),
      jsonb_build_object('label', 'X', 'url', 'https://x.com/glynfinck', 'icon', 'x'),
      jsonb_build_object('label', 'Email', 'url', 'mailto:glynfinck@gmail.com', 'icon', 'mail')
    )
  ),
  (
    'seo',
    jsonb_build_object(
      'title_template', '%s · glyn.dev',
      'default_title', 'Glyn Finck · glyn.dev',
      'description', 'Software engineer & quant researcher. Projects, blog, and quantitative research.',
      'url', 'https://glyn.dev'
    )
  )
on conflict (key) do update set value = excluded.value;

-- Projects ---------------------------------------------------------------------
insert into public.projects
  (slug, title, summary, description, tech_stack, github_url, live_url, featured, sort_order, status)
values
  (
    'crypto-data-lake',
    'Crypto Data Lake',
    'A bronze/silver/gold data lake for historical crypto market data with Hive-partitioned Parquet and DuckDB query layers.',
    'A layered data lake for OHLCV and market microstructure data. Raw exchange dumps land in bronze, get normalized into silver as Hive-partitioned Parquet, and are aggregated into gold research datasets. Query-ready via DuckDB with partition and row-group pruning.',
    array['Python', 'DuckDB', 'Parquet', 'Pandas'],
    'https://github.com/glynfinck',
    null,
    true, 1, 'published'
  ),
  (
    'backtest-engine',
    'Vectorized Backtest Engine',
    'Event-driven and vectorized backtesting for systematic strategies with realistic cost and slippage models.',
    'A backtesting framework supporting both vectorized research loops and event-driven execution simulation, with pluggable cost models, portfolio accounting, and walk-forward evaluation.',
    array['Python', 'NumPy', 'Pandas'],
    'https://github.com/glynfinck',
    null,
    true, 2, 'published'
  ),
  (
    'glyn-dev',
    'glyn.dev',
    'This site: a data-driven personal platform built with Next.js, Supabase, and shadcn/ui.',
    'Portfolio, blog, and quant research hub. Content lives in Postgres, PDFs in private storage served via signed URLs, comments via Supabase Auth, and every page updates without a redeploy thanks to tag-based revalidation.',
    array['Next.js', 'TypeScript', 'Supabase', 'Tailwind CSS'],
    'https://github.com/glynfinck',
    'https://glyn.dev',
    true, 3, 'published'
  )
on conflict (slug) do nothing;

-- Project write-ups (MDX shown on /projects/[slug]) ----------------------------
update public.projects set content = E'## Why\n\nHistorical crypto data is scattered across exchanges, formats, and rate limits. Getting a clean daily OHLCV panel for a backtest should take one query, not an afternoon of glue code.\n\n## Architecture\n\n| Layer | Format | Purpose |\n| --- | --- | --- |\n| bronze | raw JSON/CSV dumps | exactly what the exchange returned |\n| silver | Hive-partitioned Parquet | normalized, query-ready |\n| gold | aggregated Parquet | research datasets and features |\n\nEverything downstream reads silver through DuckDB:\n\n```python title="query.py"\nimport duckdb\n\ncon = duckdb.connect()\npanel = con.sql("""\n    select symbol, ts, close\n    from read_parquet(''silver/ohlcv/**/*.parquet'', hive_partitioning = true)\n    where year = 2025 and symbol in (''BTC'', ''ETH'')\n""").df()\n```\n\n<Callout type="tip">\nPartition on `year` and `symbol` and DuckDB prunes both partitions and row groups, so most queries touch a fraction of the files.\n</Callout>\n\n## Lessons learned\n\n- Schema drift between exchanges is the real enemy; normalize early and validate at the silver boundary.\n- Parquet row-group size matters more than file count once you pass a few thousand files.'
where slug = 'crypto-data-lake';

update public.projects set content = E'## Design\n\nTwo execution paths share one portfolio accounting core:\n\n- **Vectorized** for research: whole-panel NumPy operations, seconds per run.\n- **Event-driven** for validation: bar-by-bar simulation with a full order lifecycle, used before anything ships.\n\n```python\nfrom engine import Backtest, momentum\n\nbt = Backtest(strategy=momentum(lookback=90), costs="realistic")\nresult = bt.run("2020-01-01", "2025-12-31")\nprint(result.sharpe, result.max_drawdown)\n```\n\n## Cost model\n\nFills pay half the spread plus square-root market impact:\n\n$$\nc = \\underbrace{\\tfrac{s}{2}}_{\\text{spread}} + \\eta \\, \\sigma \\sqrt{\\frac{q}{V}}\n$$\n\nwhere $q$ is order size, $V$ is daily volume, and $\\sigma$ is daily volatility.\n\n<Callout type="warning">\nThe vectorized path is deliberately pessimistic about fills. If a strategy only works under optimistic fill assumptions, it does not work.\n</Callout>'
where slug = 'backtest-engine';

update public.projects set content = E'## How it works\n\nEvery page on this site is data-driven: posts, projects, research papers, and even the home-page bio live in Postgres and render through one MDX pipeline.\n\n```ts\nconst stack = {\n  frontend: "Next.js App Router + Tailwind + shadcn/ui",\n  content: "MDX stored in Postgres, rendered server-side",\n  backend: "Supabase: Postgres, Auth, private Storage",\n};\n```\n\n## Publishing flow\n\n1. Edit content in the `/admin` dashboard (or straight in Supabase Studio).\n2. The save action calls `updateTag`, or a database webhook hits `/api/revalidate`.\n3. Tag-based revalidation expires exactly the pages that changed. No redeploys.\n\n<Callout type="info">\nThe write-up you are reading right now is a row in the `projects` table.\n</Callout>'
where slug = 'glyn-dev';

-- Posts --------------------------------------------------------------------------
insert into public.posts
  (slug, title, excerpt, content, tags, status, published_at, reading_minutes)
values
  (
    'hello-world',
    'Hello, world',
    'Why I built glyn.dev, what it runs on, and what I plan to write about.',
    E'Welcome to glyn.dev — my corner of the internet for projects, writing, and quantitative research.\n\n## Why this site exists\n\nI wanted a single place that serves as portfolio, blog, and research hub — one that I can update from a dashboard without redeploying code.\n\n<Callout type="info">\nEverything you see here is data-driven: posts, projects, and even the bio on the home page live in Postgres.\n</Callout>\n\n## The stack\n\n```ts\nconst stack = {\n  frontend: "Next.js (App Router)",\n  styling: "Tailwind CSS + shadcn/ui",\n  backend: "Supabase (Postgres + Auth + Storage)",\n  deploy: "Vercel",\n};\n```\n\n## What''s next\n\nQuant strategy write-ups with the math included, like the expected return of a simple momentum signal:\n\n$$\n\\mathbb{E}[r_{t+1}] = \\alpha + \\beta \\, \\text{mom}_{t} + \\varepsilon_t\n$$\n\nSubscribe to the RSS feed if you want to follow along.',
    array['meta', 'engineering'],
    'published',
    now() - interval '2 days',
    3
  ),
  (
    'momentum-signal-decay',
    'How fast do momentum signals decay?',
    'A quick empirical look at signal decay for cross-sectional momentum, and what it means for rebalance frequency.',
    $mdx$Momentum is one of the most robust anomalies in the literature — but how quickly does the signal decay once formed?

## Setup

We form a standard cross-sectional momentum signal and track its information coefficient over increasing lags:

$$
\text{IC}(k) = \text{corr}\left(\text{mom}_t, \; r_{t+k}\right)
$$

```python title="signal.py"
import numpy as np
import pandas as pd
from dataclasses import dataclass

@dataclass
class SignalConfig:
    """Cross-sectional momentum configuration."""
    lookback: int = 90   # formation window (days)
    skip: int = 7        # skip the most recent week

def momentum_signal(prices: pd.DataFrame, cfg: SignalConfig) -> pd.DataFrame:
    # log-return momentum, skipping the most recent week
    rets = np.log(prices).diff()
    mom = rets.rolling(cfg.lookback).sum().shift(cfg.skip)
    ranked = mom.rank(axis=1, pct=True) - 0.5
    return ranked.div(ranked.abs().sum(axis=1), axis=0)

ic = signal.corrwith(fwd_returns, axis=1).mean()
print(f"mean IC: {ic:.4f}")
```

## Takeaway

<Callout type="warning">
Half-life matters more than raw IC: a strong signal that decays in days demands infrastructure a monthly rebalance never will.
</Callout>

The full write-up, with data and robustness checks, is in the linked research paper below.$mdx$,
    array['quant', 'momentum', 'research'],
    'published',
    now() - interval '1 day',
    6
  ),
  (
    'draft-example',
    'Draft: unpublished post',
    'This draft should never be visible to the public.',
    E'If you can read this without being an admin, RLS is broken.',
    array['meta'],
    'draft',
    null,
    1
  )
on conflict (slug) do nothing;

-- Research papers -------------------------------------------------------------------
insert into public.research_papers
  (slug, title, abstract, content, pdf_path, topics, status, published_at)
values
  (
    'momentum-decay-crypto',
    'Momentum Signal Decay in Crypto Markets',
    'We measure the decay profile of cross-sectional momentum signals across large-cap crypto assets, estimate signal half-lives, and derive implications for rebalance frequency and turnover-adjusted alpha.',
    E'## Overview\n\nThis paper studies how quickly cross-sectional momentum information decays in crypto markets.\n\n## Key results\n\n- Signal half-life is materially shorter than in equities\n- Turnover-adjusted alpha peaks at intermediate rebalance horizons\n- Results are robust to universe construction and cost assumptions\n\nDownload the full PDF for methodology, data description, and robustness checks.',
    'papers/momentum-decay-crypto.pdf',
    array['momentum', 'crypto', 'signal-decay'],
    'published',
    now() - interval '1 day'
  ),
  (
    'draft-paper',
    'Draft: unpublished paper',
    'This draft paper should never be visible to the public.',
    null,
    'papers/draft-paper.pdf',
    array['meta'],
    'draft',
    null
  )
on conflict (slug) do nothing;

-- Link the momentum post to the momentum paper ---------------------------------------
insert into public.post_papers (post_id, paper_id)
select p.id, rp.id
from public.posts p, public.research_papers rp
where p.slug = 'momentum-signal-decay'
  and rp.slug = 'momentum-decay-crypto'
on conflict do nothing;
