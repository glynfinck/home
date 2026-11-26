-- Two fields the public pages now render.
--
-- research_papers.highlights: the three or four headline numbers a paper leads
-- with on its card and its page, as a JSON array of
--   { "label": "Break-even fee", "value": "14.3 bps", "tone": "neutral" }
-- `tone` is "neutral" or "negative"; a negative figure is drawn in amber. The
-- shape is validated in the app (lib/highlights.ts), which also treats
-- anything malformed as "no highlights" rather than failing the page.
--
-- projects.year: shown on the project card. Nullable, because the app does
-- not guess a year for projects that have not been given one.
--
-- Both are additive and both have a default, so pages built before this
-- migration is applied and rows written before it keep working. Table-level
-- grants and RLS policies already cover new columns.

alter table public.research_papers
  add column highlights jsonb not null default '[]'::jsonb
  constraint research_papers_highlights_is_array
    check (jsonb_typeof(highlights) = 'array');

alter table public.projects
  add column year int
  constraint projects_year_plausible check (year between 1990 and 2100);
