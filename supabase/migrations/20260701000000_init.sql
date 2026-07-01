-- =============================================================================
-- glyn.dev — initial schema
-- Enums, tables, indexes, functions, triggers, RLS policies, storage buckets.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.content_status as enum ('draft', 'published', 'archived');
create type public.comment_status as enum ('visible', 'hidden');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- profiles: mirrors auth.users, populated by trigger on signup
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- site_settings: key-value config so the site is editable without redeploys
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- projects: portfolio entries
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  description text,
  tech_stack text[] not null default '{}',
  cover_image_url text,
  github_url text,
  live_url text,
  featured boolean not null default false,
  sort_order int not null default 0,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_status_featured_sort_idx
  on public.projects (status, featured, sort_order);

-- posts: blog posts (MDX source in `content`)
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content text not null default '',
  cover_image_url text,
  tags text[] not null default '{}',
  status public.content_status not null default 'draft',
  published_at timestamptz,
  reading_minutes int,
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_status_published_at_idx
  on public.posts (status, published_at desc);
create index posts_tags_idx on public.posts using gin (tags);

-- research_papers: quant write-ups; PDF lives in the private `research` bucket
create table public.research_papers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  abstract text not null,
  content text,
  pdf_path text not null,
  pdf_size_bytes bigint,
  topics text[] not null default '{}',
  status public.content_status not null default 'draft',
  published_at timestamptz,
  download_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index research_papers_status_published_at_idx
  on public.research_papers (status, published_at desc);
create index research_papers_topics_idx
  on public.research_papers using gin (topics);

-- post_papers: many-to-many — posts referencing research papers
create table public.post_papers (
  post_id uuid not null references public.posts (id) on delete cascade,
  paper_id uuid not null references public.research_papers (id) on delete cascade,
  primary key (post_id, paper_id)
);

create index post_papers_paper_id_idx on public.post_papers (paper_id);

-- paper_downloads: download tracking (user_id null for anonymous downloads)
create table public.paper_downloads (
  id bigint generated always as identity primary key,
  paper_id uuid not null references public.research_papers (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  downloaded_at timestamptz not null default now()
);

create index paper_downloads_paper_id_idx
  on public.paper_downloads (paper_id, downloaded_at desc);

-- comments: post-moderated, one-level threading, owner soft-delete
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  status public.comment_status not null default 'visible',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_post_id_created_at_idx
  on public.comments (post_id, created_at);
create index comments_parent_id_idx on public.comments (parent_id);
create index comments_user_id_idx on public.comments (user_id);

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- is_admin(): security definer so RLS policies on profiles don't recurse
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- handle_new_user(): create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'user_name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- set_updated_at(): shared updated_at bump
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();
create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();
create trigger set_posts_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();
create trigger set_research_papers_updated_at
  before update on public.research_papers
  for each row execute function public.set_updated_at();
create trigger set_comments_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

-- increment_post_views(): anon-callable counter (no direct update grant needed)
create or replace function public.increment_post_views(post_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts
  set view_count = view_count + 1
  where slug = post_slug
    and status = 'published';
$$;

-- log_paper_download(): record a download + bump the counter
create or replace function public.log_paper_download(paper_slug text)
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

  insert into public.paper_downloads (paper_id, user_id)
  values (v_paper_id, auth.uid());

  update public.research_papers
  set download_count = download_count + 1
  where id = v_paper_id;
end;
$$;

-- moderate_comment(): admin-only status change (column grants keep `status`
-- out of reach of regular users, so moderation goes through this RPC)
create or replace function public.moderate_comment(
  comment_id uuid,
  new_status public.comment_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  update public.comments set status = new_status where id = comment_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.projects enable row level security;
alter table public.posts enable row level security;
alter table public.research_papers enable row level security;
alter table public.post_papers enable row level security;
alter table public.paper_downloads enable row level security;
alter table public.comments enable row level security;

-- profiles ------------------------------------------------------------------
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- (Column-level privileges for profiles live in the Privileges section below:
-- users may only update display_name / avatar_url; is_admin stays out of reach.)

-- site_settings ---------------------------------------------------------------
create policy "Site settings are viewable by everyone"
  on public.site_settings for select
  using (true);

create policy "Admins manage site settings"
  on public.site_settings for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- projects --------------------------------------------------------------------
create policy "Published projects are viewable by everyone"
  on public.projects for select
  using (status = 'published');

create policy "Admins manage projects"
  on public.projects for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- posts -----------------------------------------------------------------------
create policy "Published posts are viewable by everyone"
  on public.posts for select
  using (status = 'published' and published_at <= now());

create policy "Admins manage posts"
  on public.posts for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- research_papers ---------------------------------------------------------------
create policy "Published papers are viewable by everyone"
  on public.research_papers for select
  using (status = 'published' and published_at <= now());

create policy "Admins manage papers"
  on public.research_papers for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- post_papers -------------------------------------------------------------------
create policy "Post-paper links are viewable by everyone"
  on public.post_papers for select
  using (true);

create policy "Admins manage post-paper links"
  on public.post_papers for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- paper_downloads ----------------------------------------------------------------
-- No client writes: rows are inserted by log_paper_download() (security definer).
create policy "Admins view downloads"
  on public.paper_downloads for select
  to authenticated
  using ((select public.is_admin()));

-- comments -----------------------------------------------------------------------
create policy "Visible comments are viewable by everyone"
  on public.comments for select
  using (status = 'visible' and deleted_at is null);

create policy "Admins manage comments"
  on public.comments for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Users can comment on published posts"
  on public.comments for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'visible'
    and deleted_at is null
    and exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.status = 'published'
        and p.published_at <= now()
    )
    -- one-level threading: parent must be a top-level comment on the same post
    and (
      parent_id is null
      or exists (
        select 1 from public.comments c
        where c.id = parent_id
          and c.post_id = post_id
          and c.parent_id is null
      )
    )
  );

create policy "Users can update own comments"
  on public.comments for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Hard delete is admin-only ("Admins manage comments" covers it; owners
-- soft-delete via deleted_at). Column-level privileges below keep `status`
-- out of reach — moderation goes exclusively through moderate_comment().

-- ---------------------------------------------------------------------------
-- Privileges
--
-- Grants are the table-level cap; RLS filters rows within them. Local stacks
-- ship locked-down (no implicit grants), while hosted projects have broad
-- default privileges — so we revoke everything and grant precisely, making
-- both environments behave identically.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;

-- Public content: readable by everyone (RLS narrows to published/visible rows)
grant select on
  public.profiles,
  public.site_settings,
  public.projects,
  public.posts,
  public.research_papers,
  public.post_papers,
  public.comments
to anon, authenticated;

-- Download stats: admin-only (RLS), never anon
grant select on public.paper_downloads to authenticated;

-- Content writes (RLS restricts every one of these to admins)
grant insert, update, delete on
  public.site_settings,
  public.projects,
  public.posts,
  public.research_papers,
  public.post_papers
to authenticated;

-- Comments: users insert their own; may update only body (edit) and
-- deleted_at (soft delete); delete is RLS-gated to admins
grant insert on public.comments to authenticated;
grant update (body, deleted_at) on public.comments to authenticated;
grant delete on public.comments to authenticated;

-- Profiles: users may update only their display fields (never is_admin)
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- RPCs
revoke all on function public.is_admin() from public;
revoke all on function public.increment_post_views(text) from public;
revoke all on function public.log_paper_download(text) from public;
revoke all on function public.moderate_comment(uuid, public.comment_status) from public;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.increment_post_views(text) to anon, authenticated;
grant execute on function public.log_paper_download(text) to anon, authenticated;
grant execute on function public.moderate_comment(uuid, public.comment_status) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage buckets & policies
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'media', 'media', true,
    10485760, -- 10 MB
    array['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif']
  ),
  (
    'research', 'research', false,
    52428800, -- 50 MB
    array['application/pdf']
  )
on conflict (id) do nothing;

-- media: public read; admin-only writes
create policy "Public read media"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "Admins insert media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));

create policy "Admins update media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));

create policy "Admins delete media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));

-- research: private — no public read policy. Downloads go through the
-- signed-URL route (service role). Admin needs API access for the dashboard.
create policy "Admins read research"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'research' and (select public.is_admin()));

create policy "Admins insert research"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'research' and (select public.is_admin()));

create policy "Admins update research"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'research' and (select public.is_admin()));

create policy "Admins delete research"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'research' and (select public.is_admin()));
