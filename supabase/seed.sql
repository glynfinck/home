-- =============================================================================
-- glyn.dev — local development seed data
--
-- Mirrors the published content on https://glyn.dev so local looks like prod,
-- and adds the fixtures the test suite and the interactive features need.
--
-- Two classes of row live here:
--
--   * Production mirror — the projects, posts, and paper that are actually
--     live. Slugs match prod exactly (verified against glyn.dev/sitemap.xml),
--     so a local page and its production counterpart share a URL.
--   * Test fixtures — `hello-world`, `draft-example`, `momentum-signal-decay`,
--     `momentum-decay-crypto`, `draft-paper`. These are NOT on prod. They are
--     referenced by tests/integration/rls.test.ts and tests/e2e/site.test.ts,
--     so removing them breaks the suite.
--
-- Article bodies for the two production posts are ABRIDGED. The full text
-- lives only in the production database; this is enough to exercise the MDX
-- pipeline, the figures, sidenotes, and the table of contents locally.
--
-- Re-runnable: every statement upserts on its natural key.
-- =============================================================================

-- Site settings ---------------------------------------------------------------
insert into public.site_settings (key, value) values
  (
    'profile',
    jsonb_build_object(
      'name', 'Glyn Finck',
      'headline', 'Software engineer, learning in the open.',
      'bio', 'I''m a software engineer sharing the tools I build and the experiments I''m working through, methods included.',
      'location', 'London, England',
      'email', 'glynfinck@gmail.com',
      'resume_url', '',
      'about', E'I grew up in Vancouver, Canada, and I still spend as much time outdoors as London lets me.\n\nI got into mathematics and science at Rockridge Secondary, started at the University of Victoria, and an introductory C course turned out to be the thing that stuck. I transferred into Engineering Physics at UBC and drifted steadily toward software.\n\nSince 2022 I have been a systems developer at Connor Clark & Lunn Financial Group in London, building data infrastructure for investment management: high-volume ETL from market data vendors, KDB and .NET financial data services, and Python and Prefect adoption across teams. I built Prefectfg, an internal platform that turns open-source Prefect into a multi-tenant, self-hosted orchestration system.\n\nOutside work I write up the quantitative research I do on my own time, methods and failures included.'
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
      'description', 'Glyn Finck is a software engineer building and researching in the open. Projects, engineering write-ups, and experiments.',
      'url', 'https://glyn.dev'
    )
  )
on conflict (key) do update set value = excluded.value;

-- Projects --------------------------------------------------------------------
-- The five projects live on glyn.dev/projects, in the same order.
insert into public.projects
  (slug, title, summary, description, tech_stack, github_url, live_url, featured, sort_order, status)
values
  (
    'glyn-dev',
    'glyn.dev',
    'A data-driven personal platform (portfolio, blog, and research hub) built with Next.js 16, Supabase, and shadcn/ui, where every page updates without a redeploy.',
    'This site. Content lives in Postgres as MDX and renders through React Server Components, so publishing is a database write rather than a deploy.',
    array['Next.js', 'TypeScript', 'Supabase', 'Tailwind CSS', 'shadcn/ui', 'MDX', 'Vercel'],
    'https://github.com/glynfinck/home',
    'https://glyn.dev',
    true,
    1,
    'published'
  ),
  (
    'graph-editor',
    'Graph Editor',
    'Draw a graph, write a traversal in real Python (networkx included), and watch every step animate with play, pause, and scrub. A ground-up rewrite of my 2021 prototype into a full product with accounts, saved graphs, and multi-file Python projects.',
    'An interactive tool for visualising graph algorithms.',
    array['Next.js', 'React', 'TypeScript', 'Python', 'Pyodide', 'Pixi.js', 'Supabase', 'Vercel'],
    'https://github.com/glynfinck/graph-editor',
    'https://graph-editor.glyn.dev',
    true,
    2,
    'published'
  ),
  (
    'recycling-robot',
    'Autonomous Recycling Robot',
    'An autonomous robot on NVIDIA Jetson that maps and navigates office spaces to collect plastic bottles.',
    'Capstone project combining SLAM-based navigation with a YOLOv3 detector trained to find bottles in cluttered office scenes.',
    array['Python', 'ROS', 'NVIDIA Jetson', 'YOLOv3', 'SLAM'],
    'https://github.com/glynfinck/recycling-robot',
    null,
    false,
    3,
    'published'
  ),
  (
    'calvin',
    'CALVIN',
    'A competition robot that follows tape, reads infrared beacons, grabs "agents" with a crane and claw, and ziplines them home.',
    'Built for a first-year engineering physics robot competition, entirely on analog electronics and an Arduino-class board.',
    array['Arduino', 'C++', 'TINAH Board', 'Robotics', 'Analog Electronics', 'CAD'],
    'https://github.com/glynfinck/calvin',
    null,
    false,
    4,
    'published'
  ),
  (
    'precision-os',
    'Precision OS: VR Surgical Planning',
    'A VR tool that lets surgeons view fractured bones from 3D CT scans inside an interactive skeleton, with a bone-classification algorithm to label the fragments.',
    'Built during a co-op term at Precision OS.',
    array['Unreal Engine 4', 'C++', 'MATLAB'],
    null,
    null,
    false,
    5,
    'published'
  )
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  description = excluded.description,
  tech_stack = excluded.tech_stack,
  github_url = excluded.github_url,
  live_url = excluded.live_url,
  featured = excluded.featured,
  sort_order = excluded.sort_order,
  status = excluded.status;

-- Posts -----------------------------------------------------------------------

-- 1. Production mirror: the pairs-trading post.
--
-- The body is abridged, but it deliberately exercises every MDX feature the
-- site has: interactive figures, sidenotes, KaTeX, a titled + line-highlighted
-- code block, a callout, and a paper embed. If a feature regresses, this post
-- is where it shows up first.
insert into public.posts
  (slug, title, excerpt, content, tags, status, published_at, reading_minutes)
values
  (
    'the-mean-reversion-you-cant-trade',
    'The mean reversion you can''t trade',
    'I spent eleven months building an optimal-stopping pairs strategy on crypto. The math worked, the pipeline worked, and the edge turned out to live exactly where it cannot be harvested.',
    $mdx$
I spent eleven months on an optimal double-stopping pairs strategy for crypto. This is what it found, and why the finding is not a strategy.

## The paper that took it over

The setup is the classic one: model the spread between two cointegrated assets as an Ornstein-Uhlenbeck process, then solve for the entry and exit levels that maximise expected value. The spread follows

$$
dX_t = \theta(\mu - X_t)\,dt + \sigma\,dW_t
$$

and the optimal-stopping problem asks when to open and when to close.<Sidenote>The double-stopping formulation matters: solving entry and exit jointly gives materially different levels than solving exit alone and entering at a fixed z-score.</Sidenote>

## Re-deriving it until it computed

The value function involves confluent hypergeometric functions, and the naive form overflows for the parameter ranges crypto actually produces. Working with the ratio directly rather than the two functions separately keeps everything in range.

```python title="ratio_trick.py" {6-9}
import numpy as np
from scipy.special import hyp1f1, gammaln

def f_ratio(x, theta, mu, sigma):
    """F'/F without ever materialising F, which overflows past |z| ~ 40."""
    z = (x - mu) * np.sqrt(2 * theta) / sigma
    a, b = 0.5, 0.5
    num = hyp1f1(a + 1, b + 1, z**2) * 2 * z * a / b
    return num / hyp1f1(a, b, z**2)
```

<Callout type="tip">
Every reformulation was checked against a high-precision reference before it
was allowed near the backtest. Relative error stayed under 1e-10 across the
whole parameter grid.
</Callout>

## Building the machine

4,950 candidate pairs, one-minute Kraken bars, a year of data. Rolling OU fits, entry and exit levels recomputed as parameters drift, and execution delayed by a random lag plus a volume-dependent lag so fills are not free.

## The equity curve that looked beautiful

Here is the whole backtest. The paper's baseline assumption is 2 basis points per side, and at that level it makes money.

Drag the slider.

<Chart src="/figures/pairs-equity.json" caption="The same 38,241 trades, priced at whatever fee you choose. The strategy I thought I had is the one at 2 bps." />

The curve does not survive contact with a realistic fee. Break-even is 14.3 bps. Kraken's real maker tier is 14 bps, which leaves $46 on the year; the taker tier is 24 bps, which loses $1,496.

## Three ways I lied to myself

Look-ahead in the parameter fit, survivorship in the pair list, and a fee assumption nobody retail actually gets. The first two I fixed. The third is the post.

## The finding

The profit is not spread evenly across the universe. It concentrates in the least liquid leg.<Sidenote>Ranks are of the *less liquid* leg of each pair, by one-year quote volume, which is the binding constraint. The illiquid tail alone carries $1,823 of the $2,414 gross.</Sidenote>

<Chart src="/figures/pairs-volume-rank.json" caption="Gross PnL by the less-liquid leg's volume rank. Negative in the majors. Just over 75% of the edge sits in the illiquid tail." />

That is the whole result. The gross edge is an illiquidity premium, sitting exactly where spreads, borrow, and roughly $14k of capacity make it unharvestable.

## Trying to save it anyway

| Hypothesis | Result |
| --- | --- |
| Other venues have better fees | Worse spreads eat the difference |
| Cross-exchange widens the spread | Transfer latency kills it |
| An ML filter can pick the good trades | No lift out of sample |
| Size down and trade more pairs | Capacity was never the binding limit |

## The part where I tell the truth

A backtest that only works at fees you cannot get is not a strategy. It is a measurement of how much someone would have to be paid to provide liquidity in the tail.

## What survived

The pipeline, the derivation, and a much shorter list of things I take at face value.

<PaperCard slug="ou-pairs-limits-of-arbitrage" />
$mdx$,
    array['quant', 'statarb', 'crypto', 'pairs-trading', 'research'],
    'published',
    timestamptz '2026-07-14 09:00:00+00',
    12
  ),
  -- 2. Production mirror: the AI post.
  (
    'ai-shines-on-defined-problems',
    'AI shines on problems you''ve already defined',
    'I took a side project I built by hand in 2021 and used AI to turn it into a product-level app in a few days.',
    $mdx$
In 2021 I hand-built a graph editor to teach myself React. In 2026 I rebuilt it with AI assistance in a few days, and the difference was not the typing speed.

## The 2021 version

A canvas, some nodes, a BFS that ran and animated. It worked, and it was a prototype in every way that matters: no accounts, no persistence, no way to write your own algorithm.

## What changed

The rebuild has accounts, saved graphs, multi-file Python projects, and a real playback engine. The reason it went quickly is not that the AI is clever. It is that I had already made every hard decision, five years earlier, by building the thing badly once.

> The hard part of software is not writing code, it is deciding what to write.

Fred Brooks called the essential complexity the part you cannot automate away. That still holds. What AI removed was the accidental complexity: the boilerplate, the config, the third rewrite of the same reducer.

## Where it did not help

Every place the design was still open. Asking for "a good playback API" produced plausible code that solved a problem I had not actually specified yet. The moment I wrote the frame format down, it became fast again.

## The takeaway

AI is leverage on a defined problem. If you cannot describe what you want precisely enough to review the answer, the leverage points the wrong way.
$mdx$,
    array['ai', 'engineering', 'projects'],
    'published',
    timestamptz '2026-07-06 09:00:00+00',
    5
  ),
  -- 3. Test fixture (not on prod): tests/e2e/site.test.ts asserts this post
  --    renders KaTeX, highlighted code, and a "Referenced research" block.
  (
    'momentum-signal-decay',
    'How fast do momentum signals decay?',
    'Measuring the half-life of cross-sectional momentum in crypto, and what it implies for rebalance frequency.',
    $mdx$
A short fixture post that exercises the MDX pipeline.

## The model

Signal strength decays roughly exponentially:

$$
s(t) = s_0 e^{-\lambda t}
$$

## The code

```python title="halflife.py"
import numpy as np

def half_life(lmbda: float) -> float:
    return np.log(2) / lmbda
```

Full methodology is in the linked paper.
$mdx$,
    array['quant', 'momentum', 'research'],
    'published',
    timestamptz '2026-07-01 09:00:00+00',
    6
  ),
  -- 4. Test fixture (not on prod): RLS "published post is visible" case.
  (
    'hello-world',
    'Hello, world',
    'Why this site exists and what I plan to put on it.',
    $mdx$
A fixture post used by the RLS and view-counter tests.
$mdx$,
    array['meta', 'engineering'],
    'published',
    timestamptz '2026-06-28 09:00:00+00',
    3
  ),
  -- 5. Test fixture (not on prod): RLS "draft is hidden" case.
  (
    'draft-example',
    'Draft: unpublished post',
    'This draft should never be visible to the public.',
    $mdx$
If you can read this without being an admin, RLS is broken.
$mdx$,
    array['meta'],
    'draft',
    null,
    1
  )
on conflict (slug) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  tags = excluded.tags,
  status = excluded.status,
  published_at = excluded.published_at,
  reading_minutes = excluded.reading_minutes;

-- Research papers -------------------------------------------------------------
--
-- NOTE: `pdf_path` points at an object in the private `research` bucket. Local
-- storage is empty on a fresh `supabase db reset`, so "Download PDF" 404s
-- until you upload one through /admin/media. The e2e suite uploads its own
-- sample for `momentum-decay-crypto` in tests/e2e/global-setup.ts.
insert into public.research_papers
  (slug, title, abstract, content, pdf_path, topics, status, published_at)
values
  (
    'ou-pairs-limits-of-arbitrage',
    'Optimal Mean-Reversion Pairs Trading in Cryptocurrency Markets: A Limits-of-Arbitrage Study',
    'We implement an optimal double-stopping framework for cryptocurrency pairs on Kraken, analysing 4,950 symbol pairs at one-minute resolution over a year and 38,241 simulated trades. Special forms of the value function are derived so the problem computes at scale. Mean reversion is present in the data, generating $1,896 net profit at 2 basis points with an 81% win rate, but the gross edge is an illiquidity premium: it sits exactly where spreads, borrow, and roughly $14k of capacity make it unharvestable. At realistic fees the result turns negative, and alternative venues, cross-exchange execution, and machine-learning filters all fail to recover it.',
    $mdx$
## Overview

The full derivation, data construction, and robustness checks are in the PDF. The headline numbers are reproduced in the accompanying post.

## Method

Spreads are modelled as an Ornstein-Uhlenbeck process and the entry and exit
levels solved jointly as a double optimal-stopping problem, with parameters
refit on a rolling window.

## Result

Break-even is 14.3 basis points per side. Every venue a retail participant can
actually reach charges more than that.
$mdx$,
    'papers/ou-pairs-limits-of-arbitrage.pdf',
    array['quant', 'arbitrage', 'cryptocurrency', 'mean-reversion', 'optimal-stopping'],
    'published',
    timestamptz '2026-07-14 09:00:00+00'
  ),
  -- Test fixture (not on prod): download + RLS cases.
  (
    'momentum-decay-crypto',
    'Momentum Signal Decay in Crypto Markets',
    'We measure the decay profile of cross-sectional momentum signals across large-cap crypto assets, estimate signal half-lives, and derive implications for rebalance frequency and turnover-adjusted alpha.',
    E'## Overview\n\nThis paper studies how quickly cross-sectional momentum information decays in crypto markets.\n\n## Key results\n\n- Signal half-life is materially shorter than in equities\n- Turnover-adjusted alpha peaks at intermediate rebalance horizons\n- Results are robust to universe construction and cost assumptions',
    'papers/momentum-decay-crypto.pdf',
    array['momentum', 'crypto', 'signal-decay'],
    'published',
    timestamptz '2026-07-01 09:00:00+00'
  ),
  -- Test fixture (not on prod): unpublished-download 404 case.
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
on conflict (slug) do update set
  title = excluded.title,
  abstract = excluded.abstract,
  content = excluded.content,
  pdf_path = excluded.pdf_path,
  topics = excluded.topics,
  status = excluded.status,
  published_at = excluded.published_at;

-- Post <-> paper links ---------------------------------------------------------
insert into public.post_papers (post_id, paper_id)
select p.id, rp.id
from public.posts p
join public.research_papers rp on true
where (p.slug, rp.slug) in (
  ('the-mean-reversion-you-cant-trade', 'ou-pairs-limits-of-arbitrage'),
  -- Required by tests/e2e/site.test.ts ("Referenced research" assertion).
  ('momentum-signal-decay', 'momentum-decay-crypto')
)
on conflict do nothing;
