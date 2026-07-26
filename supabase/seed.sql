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
--
-- ⚠️  ESCAPE CURRENCY IN MDX BODIES. remark-math reads `$...$` as inline math,
--     so a sentence with two dollar amounts ("leaves $46 ... loses $1,496")
--     silently becomes an equation and renders one character per line. Write
--     `\$46` in prose. Display math (`$$...$$`) is unaffected, and plain-text
--     columns like `research_papers.abstract` never reach remark-math.
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
-- This is the LIVE article text, verbatim, with only the two remaining static
-- <Figure> PNGs swapped for their interactive <Chart> equivalents. Keeping it
-- byte-faithful is the point: local previews are only trustworthy if they
-- render what production renders.
--
-- Note the escaped currency (\$1,896). remark-math reads `$...$` as inline
-- math, so an unescaped pair of dollar amounts in one sentence silently
-- becomes an equation. Display math ($$...$$) is unaffected.
insert into public.posts
  (slug, title, excerpt, content, tags, status, published_at, reading_minutes)
values
  (
    'the-mean-reversion-you-cant-trade',
    'The mean reversion you can''t trade',
    'I spent eleven months building an optimal-stopping pairs strategy on crypto. The math worked, the pipeline worked, and the edge turned out to live exactly where it cannot be harvested. On failure, fees, and what survived.',
    $mdx$
Eleven months ago I started a project that I thought was going to make me money. It didn't. This is what it gave me instead.

## The paper that took it over

In August 2025 I started where every self-taught quant starts: notebooks. First simulated mean-reverting processes, then rolling cointegration tests on real crypto pairs, then a spread z-score with thresholds I picked by eyeball (enter above 3, exit back under 1, and I could not have defended either number). Every choice felt arbitrary because it was.

The difference was that I already knew roughly where a better answer lived: I'd been circling Tim Leung's work on mean-reversion trading almost from the start. The paper that ended up taking over the project was Leung & Li's *Optimal Mean Reversion Trading with Transaction Costs and Stop-Loss Exit* ([arXiv:1411.5062](https://arxiv.org/abs/1411.5062)). If your spread follows an Ornstein-Uhlenbeck process,

$$
dX_t = \mu\,(\theta - X_t)\,dt + \sigma\,dW_t,
$$

then the right moment to enter and the right moment to exit aren't judgment calls. They're the solution to an optimal double-stopping problem, and the solution is *exact*. There is one optimal entry level $d^*$ and one optimal exit level $b^*$, and they fall out of two functions $F$ and $G$ that solve the process's differential equation. After the eyeballed thresholds, closed-form optimality felt like being handed a superpower.

I decided to build it properly. Not notebook-properly. Properly.

## Re-deriving it until it computed

The paper gives you $F$ and $G$ as integrals (here $r$ is the discount rate):

$$
\begin{aligned}
F(x) &= \int_0^\infty u^{\,r/\mu - 1}\, \exp\!\left(\sqrt{\tfrac{2\mu}{\sigma^2}}\,(x-\theta)\,u - \tfrac{u^2}{2}\right) du,\\[4pt]
G(x) &= \int_0^\infty u^{\,r/\mu - 1}\, \exp\!\left(\sqrt{\tfrac{2\mu}{\sigma^2}}\,(\theta-x)\,u - \tfrac{u^2}{2}\right) du \;=\; F(2\theta - x).
\end{aligned}
$$

Everything optimal comes out as roots of these two functions. The optimal exit level $b^*$ is the unique root of the smooth-pasting condition

$$
F(b) \;=\; (b - c)\,F'(b),
$$

with $c$ the transaction cost. The value of holding a position is then

$$
V(x) \;=\; (b^* - c)\,\frac{F(x)}{F(b^*)} \qquad (x < b^*),
$$

and the optimal entry level $d^*$ is the unique root of

$$
G(d)\,\bigl( V'(d) - 1 \bigr) \;=\; G'(d)\,\bigl( V(d) - d - c \bigr).
$$

That is the paper's entire prescription: two integrals, two root-finding problems, exact. What it isn't is computable at scale. You can quadrature those integrals once. You cannot quadrature them ten million times, which is roughly what screening 4,950 pairs over a year of one-minute bars requires. So the first real work was reformulation. That integral is a parabolic cylinder function in disguise, a closed form that's classical in the OU literature (it's in Borodin & Salminen's *Handbook of Brownian Motion*; I claim zero credit for it):

$$
F(x) = \Gamma(a)\, e^{\beta^2/4}\, D_{-a}(-\beta), \qquad a = \tfrac{r}{\mu},\;\; \beta = \sqrt{\tfrac{2\mu}{\sigma^2}}(x - \theta),
$$

which SciPy will evaluate for you. Except it won't, not on real data. That $e^{\beta^2/4}$ factor overflows double precision once $|\beta| \gtrsim 53$, and on microcap spreads $\beta$ at the optimal levels routinely reaches the hundreds.

The way out is one of those tricks that looks obvious only after you've found it: the optimal-stopping conditions never need $F$ itself, only *ratios* like $F'/F$, and in a ratio the overflow factor cancels exactly. One recurrence identity later, the whole thing collapses to a single special-function call:

```python title="ratio_trick.py"
def F_prime_over_F(x, mu, sigma, theta, r):
    """Leung-Li F'/F without the exp(beta^2/4) overflow."""
    a = r / mu
    kappa = np.sqrt(2 * mu) / sigma
    beta = kappa * (x - theta)
    D, D_prime = pbdv(-a, -beta)          # one call: value and derivative
    return kappa * (beta / 2 - D_prime / D)
```

Now divide the paper's two conditions through by $F$ and $G$, and they collapse into equations built entirely from those overflow-free ratios. The exit condition becomes

$$
(x - c)\,\frac{F'(x)}{F(x)} - 1 \;=\; 0,
$$

and the entry condition, using $V'(x) = V(x)\,F'(x)/F(x)$, becomes

$$
\frac{G'(x)}{G(x)}\,\bigl( V(x) - x - c \bigr) \;-\; \left( V(x)\,\frac{F'(x)}{F(x)} - 1 \right) \;=\; 0.
$$

The one piece that isn't a pure ratio, $V(x) = (b^* - c)\,F(x)/F(b^*)$, is evaluated in log space, where the leftover exponent $\tfrac{1}{4}\bigl(\beta(x)^2 - \beta(b^*)^2\bigr)$ is a modest number whenever both points sit inside the trading range, even though each factor alone would overflow. Same roots as the paper's conditions, but every term is now a single stable special-function call, findable by a vectorized bracketing solver across thousands of parameter sets at once. For the extreme tails where even that kernel gives up, Watson's lemma supplies the asymptotics.

<Chart slug="pairs-crossover" caption="Every representation checked against an overflow-free quadrature reference. The exact kernel is good to reference precision until SciPy's pbdv dies (asymmetrically: +53 by overflow, -41 by underflow); the asymptotic fallbacks take over from there." />

Deriving this (filling the gap between "a paper says it's optimal" and "my machine computes it in bulk") is the part of the project I would do again for free.

## Building the machine

Around the math grew a system. Rolling OLS for hedge ratios. A hand-rolled rolling cointegration test: rolling Engle-Granger with a proper ADF on the residuals, because nothing off the shelf would do it fast enough. OU parameters re-estimated on every window using the exact discrete transition, not the Euler approximation. A Numba state machine simulating execution delays, volume caps, borrow costs, stops.

The first version ran on Dask over a Postgres feature store, with a cloud cluster for scale-out. It spent most of its life managing connections and serializing dataframes. The rewrite deleted all of it: a DuckDB-queried Parquet lake and a local process pool turned out to be dramatically faster for the per-pair work than the distributed architecture I'd been proud of. That deletion was its own education.

Top 100 USD pairs on Kraken by volume. Every pair of them: 4,950 combinations. A year of one-minute bars. 38,241 simulated round trips.

<Chart slug="pairs-trade-anatomy" caption="One real round trip at the computed optimal levels. LINKUSD - 0.41 x ZECUSD, January 2025: entry below d*, sixty hours of noise, exit above b*." />

## The equity curve that looked beautiful

The backtest came back at a \$1,896 profit on an 81% win rate, with a per-trade Sharpe that annualized to double digits. For a while, the project felt finished. I had taken a paper, made the math computable, industrialized it, and it *worked*.

Then I checked my fee assumption against Kraken's published schedule. That one check turned into a two-day audit, and by the end of it the profit was gone.

## Three ways I lied to myself

<Callout type="warning">
**The fee that was wrong by 12-20x.** My config said 2 bps per side, a derivatives fee on a spot strategy. One call to Kraken's public fee API: at my book's actual volume tier, spot taker is **0.24%** per side, maker 0.14%. Repricing the identical trades moved the headline from **+\$1,896 to -\$1,496**. The break-even fee is 0.143% per side, below every taker tier my capacity could ever reach, and this design crosses the spread on every trade.
</Callout>

<Callout type="warning">
**The Sharpe that annualized itself into fiction.** A per-trade Sharpe of 0.053, annualized under a per-trade i.i.d. assumption across 38,000 trades, becomes a headline Sharpe of 10.2. But trades that share days, regimes, and short legs are not independent. Rebuilt as an honest daily portfolio series, the same book Sharpes at 1.4, and at real fees, **-1.1**. The i.i.d. assumption alone was a 7x exaggeration.
</Callout>

<Callout type="warning">
**The short book I didn't know I had.** Trading every pair one-sided means a single volatile microcap can sit on the short leg of dozens of positions at once. On January 17, 2025, one +18% pump in one small asset (XCN) caused 92% of the day's losses across 722 closing trades and, at the time, erased several multiples of the strategy's lifetime profit. My hedge ratios had a median of 46 and a 99th percentile of 11.9 million. That is not a hedge; that's a levered short with paperwork.
</Callout>

<Chart slug="pairs-equity" caption="The same 38,241 trades, priced at whatever fee you choose. The strategy I thought I had is the one at 2 bps." />

## The finding

Here's where it stops being a story about my mistakes and becomes a finding, because after fixing all three, the mean reversion is still *there*. The spreads really do revert. The machinery really does harvest them: \$2,414 gross. The effect is real.

Then you sort the profits by the liquidity of each pair's worse leg:

<Chart slug="pairs-volume-rank" caption="Gross PnL by the less-liquid leg's volume rank. Negative in the majors. Just over 75% of the edge sits in the illiquid tail." />

The gross edge doesn't just shrink as pairs get more liquid: it *vanishes*, and then goes slightly negative. Among the top-15 assets, where you could actually trade size, there is nothing. Just over 75% of the entire edge sits in pairs whose worse leg ranks 51-100 by volume: assets with 25-100 bps half-spreads, unreliable or absent borrow, and a median trade size, in my own backtest, of \$18, against maybe \$14k of total capacity.

And at the taker fee my volume tier actually pays, **every bucket is negative, including the tail**. The edge exists only where it cannot be harvested, and even there it doesn't clear its own collection costs.

That's not a bug. That's the market working. Shleifer and Vishny called it the [limits of arbitrage](https://doi.org/10.1111/j.1540-6261.1997.tb03807.x): mispricings persist in proportion to the frictions that stop arbitrageurs from correcting them. Where institutions can trade, the inefficiency is gone. Where they can't, where the fees, spreads, and borrow costs exceed the prize, a small, real, untouchable anomaly survives, like moss growing where the mowers can't reach. I hadn't discovered an edge. I had *measured a friction*.

## Trying to save it anyway

I didn't accept that gracefully. Four salvage attempts, in escalating order of desperation:

| Hypothesis | Result | Verdict |
|---|---|---|
| Cheaper venue (full re-run on Binance, honest fees + live spreads) | -\$71/yr vs Kraken's -\$88 | dead |
| Cross-exchange basis (Kraken vs Binance, same asset) | real & fast-reverting, but 6-12 bps of basis vs ~68 bps of cost | dead |
| ML meta-labeling (LightGBM, 35 features, purged walk-forward) | out-of-sample R-squared negative in 13/14 folds, **deflated Sharpe 0.000** | dead |
| Cost-aware optimal bands (re-solve levels with the true per-pair cost) | win rate 49% to 77%, and still net-negative in every configuration | dead |

The machine-learning one stung the most, because meta-labeling is the literature's officially recommended rescue for exactly this situation. Under strict leakage control it has no predictive power at all. You cannot filter your way to an edge that isn't there.

The venue experiment mattered for a different reason: Binance's fees are less than half of Kraken's, and the strategy still loses. The binding constraint was never the fee schedule. The gross edge itself is structurally too thin.

## The part where I tell the truth

I was gutted. Eleven months (the MLE study notebooks, the derivations, the pipeline, the rewrite, the 186 tests), and the honest answer at the end of it is: *this does not work, and no adjacent version of it works either*. There was an afternoon, right after the fee repricing flipped the sign, where I just sat with it. I'd told myself a story for most of a year, and the story had a spreadsheet error in the second act.

I'm not going to dress that up. Watching a year of work resolve to a negative number is a specific kind of grief, and pretending otherwise would be one more way of lying to myself, which is the exact habit this project beat out of me.

And since this section is called what it's called: a lot of this project was built by directing Claude: much of the code, and candidate steps in some of the derivations, came out of long sessions of me setting the problem, steering, and choosing between its attempts. (The derivative extension of the closed form I worked out by hand, and the idea of canceling the overflow in ratios was mine too; Claude helped me push the algebra through from there. Those I'm keeping.) The judgment calls, the mistakes, and the verification are mine; I checked every derivation against direct computation. But I didn't type most of it alone, and I want that on the record for the same reason I want the fee schedule on the record.

## What survived

But here is what I keep coming back to. The *strategy* died. Almost nothing else did.

The math survived: the parabolic-cylinder reformulation and the overflow-free ratios apply to any OU optimal-stopping problem, and they're now numerically verified against direct quadrature (done in log space at the extremes, since out there the raw integrand overflows before the closed form does). The pipeline survived: the lake, the rolling estimators, the leak-free evaluation harness with purged cross-validation and deflated Sharpe. The *discipline* survived, and it turned out to be the real asset: fees from the venue's live API instead of a config constant; daily portfolio Sharpe instead of per-trade fantasy; deflated Sharpe as the gate every result must pass.

Two weeks after shelving this strategy, I pointed the same harness at a different edge source: funding-rate carry. One configuration passed the same deflated-Sharpe gate that had just executed my pairs strategy (DSR 0.994, though it hasn't been validated out-of-sample yet, and the harness that killed this strategy has earned the right to kill that one too). Without this failure, I'd have had no harness, no gate, and no reason to trust any number the next backtest showed me.

I set out to extract alpha from mean reversion. What I actually built was the ability to find out, quickly, honestly, and at scale, whether *any* strategy is real. It took losing one I loved to learn that the second thing is worth more.

The full derivations, tables, and robustness checks are in the paper below.
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

Full methodology is in the linked paper.<Sidenote>Sidenotes are exercised here rather than on the production posts, so the mirrored articles stay byte-faithful to what is live.</Sidenote>
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
