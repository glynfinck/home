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
    E'Momentum is one of the most robust anomalies in the literature — but how quickly does the signal decay once formed?\n\n## Setup\n\nWe form a standard cross-sectional momentum signal and track its information coefficient over increasing lags:\n\n$$\n\\text{IC}(k) = \\text{corr}\\left(\\text{mom}_t, \\; r_{t+k}\\right)\n$$\n\n```python\nimport duckdb\n\ncon = duckdb.connect()\nic = con.sql("""\n  select lag, corr(signal, fwd_return) as ic\n  from signals\n  group by lag\n  order by lag\n""").df()\n```\n\n## Takeaway\n\n<Callout type="warning">\nHalf-life matters more than raw IC: a strong signal that decays in days demands infrastructure a monthly rebalance never will.\n</Callout>\n\nThe full write-up, with data and robustness checks, is in the linked research paper below.',
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
