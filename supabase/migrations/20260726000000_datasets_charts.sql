-- =============================================================================
-- datasets + charts: figure data and figure specs, editable from /admin.
--
-- Replaces the committed payloads in `public/figures/*.json`, where data and
-- presentation were fused into one bespoke shape per figure kind. The split
-- here is the point:
--
--   datasets          a generic table (typed columns, columnar payload)
--   dataset_versions  immutable payloads, so a published article can pin one
--   charts            a spec that draws a dataset, carrying no data itself
--
-- Public read is limited to published rows; writes are admin-only. Payloads
-- are the same numbers the rendered figure shows, so nothing here is more
-- sensitive than the article it appears in.
-- =============================================================================

create table public.datasets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  -- Provenance line rendered under the figure ("Kraken spot, 1-min bars, …").
  source text,
  -- Points at the version served when a chart does not pin one. Nullable
  -- because the row exists for a moment before its first import lands.
  current_version_id uuid,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index datasets_status_idx on public.datasets (status);

-- Immutable: an import never mutates a version, it appends one. That is what
-- makes `charts.bindings` able to pin a version and keep a published figure
-- reproducible while the underlying dataset keeps moving.
create table public.dataset_versions (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  version int not null,
  -- ColumnDef[], snapshotted rather than referenced: renaming a column later
  -- must not make older versions unreadable.
  columns jsonb not null,
  -- Columnar payload, `{ "day": [...], "gross": [...] }`. Columnar because
  -- every consumer wants columns and arrays compress far better than repeated
  -- object keys; rows are materialised at render time.
  data jsonb not null,
  row_count int not null,
  -- sha256 of the canonical payload. Re-importing identical data is a no-op
  -- instead of version churn.
  checksum text not null,
  -- Where the payload came from: an uploaded filename or a generator script.
  source_name text,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (dataset_id, version)
);

create index dataset_versions_dataset_id_version_idx
  on public.dataset_versions (dataset_id, version desc);

alter table public.datasets
  add constraint datasets_current_version_id_fkey
  foreign key (current_version_id)
  references public.dataset_versions (id) on delete set null;

create table public.charts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  caption text,
  -- The figure spec. Stored raw so the full expressiveness of the charting
  -- grammar is available without a house schema in the middle; validated by
  -- compiling it in the write path rather than by a schema check here.
  spec jsonb not null,
  -- Dataset name in the spec -> { slug, version }. `version: null` tracks the
  -- dataset's current version; a number pins it.
  bindings jsonb not null default '{}',
  -- True when the spec declares parameters, i.e. the figure ships a control.
  interactive boolean not null default false,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index charts_status_idx on public.charts (status);

-- Derived from `bindings` on every write. It exists for the `on delete
-- restrict` below: a dataset backing a published figure cannot be deleted by
-- tidying the dataset list, which a jsonb reference could never enforce.
create table public.chart_datasets (
  chart_id uuid not null references public.charts (id) on delete cascade,
  dataset_id uuid not null references public.datasets (id) on delete restrict,
  primary key (chart_id, dataset_id)
);

create index chart_datasets_dataset_id_idx on public.chart_datasets (dataset_id);

create trigger set_datasets_updated_at
  before update on public.datasets
  for each row execute function public.set_updated_at();
create trigger set_charts_updated_at
  before update on public.charts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.datasets enable row level security;
alter table public.dataset_versions enable row level security;
alter table public.charts enable row level security;
alter table public.chart_datasets enable row level security;

-- datasets ------------------------------------------------------------------
create policy "Published datasets are viewable by everyone"
  on public.datasets for select
  using (status = 'published');

create policy "Admins manage datasets"
  on public.datasets for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- dataset_versions ----------------------------------------------------------
-- Visibility follows the parent. The subquery is safe here (unlike the
-- comments threading check) because it reads `datasets`, a different table,
-- so it cannot recurse into this policy.
create policy "Versions of published datasets are viewable by everyone"
  on public.dataset_versions for select
  using (
    exists (
      select 1 from public.datasets d
      where d.id = dataset_id and d.status = 'published'
    )
  );

create policy "Admins manage dataset versions"
  on public.dataset_versions for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- charts --------------------------------------------------------------------
create policy "Published charts are viewable by everyone"
  on public.charts for select
  using (status = 'published');

create policy "Admins manage charts"
  on public.charts for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- chart_datasets ------------------------------------------------------------
create policy "Chart-dataset links are viewable by everyone"
  on public.chart_datasets for select
  using (true);

create policy "Admins manage chart-dataset links"
  on public.chart_datasets for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Privileges (the init migration revokes defaults; new tables need explicit
-- grants or nothing can read them, locally or hosted)
-- ---------------------------------------------------------------------------

grant select on
  public.datasets,
  public.dataset_versions,
  public.charts,
  public.chart_datasets
to anon, authenticated;

grant insert, update, delete on
  public.datasets,
  public.dataset_versions,
  public.charts,
  public.chart_datasets
to authenticated;

grant all on
  public.datasets,
  public.dataset_versions,
  public.charts,
  public.chart_datasets
to service_role;
