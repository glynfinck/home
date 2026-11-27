-- =============================================================================
-- Two kinds of tag: topics and technologies.
--
-- posts.tags and research_papers.topics were already topics, and
-- projects.tech_stack already technologies, but each list mixed in the other
-- kind (a post tagged "kdb", a project listing "Robotics"). The site now shows
-- the two in separate rows, technologies with their logos, so each table gets
-- the column it was missing:
--
--   posts.tech_stack   technologies a post is about ("kdb", "Python")
--   projects.topics    what a project is about ("Robotics", "SLAM")
--
-- Both are additive with a default, so pages built before this migration and
-- rows written before it keep working. Table grants and RLS already cover new
-- columns.
--
-- The data move below is for the tags in use on 2026-11-27. It matches
-- case-insensitively and is a no-op on rows that do not carry them.
-- =============================================================================

alter table public.posts
  add column tech_stack text[] not null default '{}';

create index posts_tech_stack_idx on public.posts using gin (tech_stack);

alter table public.projects
  add column topics text[] not null default '{}';

-- Posts: technologies out of tags, into tech_stack --------------------------

update public.posts p
set
  tech_stack = p.tech_stack || moved.tech,
  tags = moved.rest
from (
  select
    id,
    array(select t from unnest(tags) t where lower(t) in ('kdb', 'kdb+')) as tech,
    array(select t from unnest(tags) t where lower(t) not in ('kdb', 'kdb+')) as rest
  from public.posts
) moved
where p.id = moved.id
  and cardinality(moved.tech) > 0;

-- Projects: topics out of tech_stack, into topics ---------------------------

update public.projects p
set
  topics = p.topics || moved.topics,
  tech_stack = moved.rest
from (
  select
    id,
    array(
      select t from unnest(tech_stack) t
      where lower(t) in ('robotics', 'slam', 'cad', 'analog electronics')
    ) as topics,
    array(
      select t from unnest(tech_stack) t
      where lower(t) not in ('robotics', 'slam', 'cad', 'analog electronics')
    ) as rest
  from public.projects
) moved
where p.id = moved.id
  and cardinality(moved.topics) > 0;
