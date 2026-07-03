-- =============================================================================
-- tag_kinds: "kind" icons for tags.
-- Maps a tag name (projects.tech_stack entries) to an icon uploaded to the
-- public `media` bucket (kinds/ prefix). Public read; admin-only writes.
-- =============================================================================

create table public.tag_kinds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tags match kinds case-insensitively ("Python" and "python" are one kind)
create unique index tag_kinds_name_lower_key on public.tag_kinds (lower(name));

create trigger set_tag_kinds_updated_at
  before update on public.tag_kinds
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.tag_kinds enable row level security;

create policy "Tag kinds are viewable by everyone"
  on public.tag_kinds for select
  using (true);

create policy "Admins manage tag kinds"
  on public.tag_kinds for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Privileges (init migration revokes defaults; new tables need explicit grants)
-- ---------------------------------------------------------------------------

grant select on public.tag_kinds to anon, authenticated;
grant insert, update, delete on public.tag_kinds to authenticated;
grant all on public.tag_kinds to service_role;
