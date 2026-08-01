-- Download analytics.
--
-- Two gaps this closes:
--   1. Resume downloads were invisible. The resume lives in the public
--      `media` bucket and the buttons linked straight at it, so the request
--      never reached the app and nothing was ever recorded.
--   2. Paper downloads were recorded, but only as (paper, user, timestamp) —
--      and since sign-in exists solely for commenting, `user_id` is null for
--      the overwhelming majority. Country and referrer give the anonymous
--      rows some shape.

-- ---------------------------------------------------------------------------
-- Request context on download events
-- ---------------------------------------------------------------------------

-- `country` is the edge geo-IP country (ISO-3166-1 alpha-2), taken from the
-- `x-vercel-ip-country` header; null off-Vercel and for unresolvable IPs.
-- `referrer` is the Referer header. For in-app clicks that is one of our own
-- pages (which tells you whether a resume came from `/` or `/about`); for
-- external deep links it is the linking site.
alter table public.paper_downloads
  add column referrer text,
  add column country text;

-- The paper-scoped index can't serve "everything in the last 30 days".
create index paper_downloads_downloaded_at_idx
  on public.paper_downloads (downloaded_at desc);

-- ---------------------------------------------------------------------------
-- resume_downloads
-- ---------------------------------------------------------------------------

-- Mirrors paper_downloads minus the FK: the resume is a single artifact
-- pointed at by `site_settings.profile -> resume_url`, not a content row.
create table public.resume_downloads (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  referrer text,
  country text,
  downloaded_at timestamptz not null default now()
);

create index resume_downloads_downloaded_at_idx
  on public.resume_downloads (downloaded_at desc);

alter table public.resume_downloads enable row level security;

-- No client writes: rows are inserted by log_resume_download() (security
-- definer), exactly like paper_downloads.
create policy "Admins view resume downloads"
  on public.resume_downloads for select
  to authenticated
  using ((select public.is_admin()));

-- Privileges. The init migration's `grant all ... to service_role` was a
-- one-time snapshot over the tables that existed then, and its revoke of the
-- PUBLIC defaults likewise. Both have to be redone per new table — otherwise
-- service_role reads 403 and anon/authenticated keep the inherited
-- REFERENCES/TRIGGER/TRUNCATE grants that every other table here revokes.
revoke all on public.resume_downloads from public, anon, authenticated;
grant select on public.resume_downloads to authenticated;
grant all on public.resume_downloads to service_role;
grant usage, select on sequence public.resume_downloads_id_seq to service_role;

-- ---------------------------------------------------------------------------
-- Logging RPCs
-- ---------------------------------------------------------------------------

-- Replacing the 1-arg signature rather than overloading it: two candidates
-- named log_paper_download would leave PostgREST resolving by argument name,
-- which is a footgun the moment a caller omits one.
drop function public.log_paper_download(text);

create function public.log_paper_download(
  paper_slug text,
  p_referrer text default null,
  p_country text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paper_id uuid;
begin
  select id into v_paper_id
  from public.research_papers
  where slug = paper_slug and status = 'published';

  if v_paper_id is null then
    return;
  end if;

  insert into public.paper_downloads (paper_id, user_id, referrer, country)
  values (v_paper_id, auth.uid(), p_referrer, p_country);

  update public.research_papers
  set download_count = download_count + 1
  where id = v_paper_id;
end;
$$;

create function public.log_resume_download(
  p_referrer text default null,
  p_country text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.resume_downloads (user_id, referrer, country)
  values (auth.uid(), p_referrer, p_country);
$$;

revoke all on function public.log_paper_download(text, text, text) from public;
revoke all on function public.log_resume_download(text, text) from public;

grant execute on function public.log_paper_download(text, text, text)
  to anon, authenticated;
grant execute on function public.log_resume_download(text, text)
  to anon, authenticated;
