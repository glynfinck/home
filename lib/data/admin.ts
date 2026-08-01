import "server-only";

import { unstable_noStore } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/helpers";

/**
 * Admin reads — always fresh, always under the admin's cookie session
 * (admin RLS policies expose drafts and hidden comments).
 */

export async function adminListPosts() {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, slug, title, status, published_at, view_count, updated_at, tags",
    )
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function adminGetPost(id: string) {
  unstable_noStore();
  const supabase = await createClient();
  const [{ data: post, error }, { data: links, error: linksError }] =
    await Promise.all([
      supabase.from("posts").select("*").eq("id", id).maybeSingle(),
      supabase.from("post_papers").select("paper_id").eq("post_id", id),
    ]);
  if (error) throw error;
  if (linksError) throw linksError;
  return post
    ? { ...post, paperIds: (links ?? []).map((l) => l.paper_id) }
    : null;
}

export async function adminListProjects() {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, slug, title, status, featured, sort_order, updated_at")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function adminGetProject(id: string) {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function adminListTagKinds() {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tag_kinds")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
}

export type TagField = "tech_stack" | "tags" | "topics";

async function tagsInUse(
  supabase: Awaited<ReturnType<typeof createClient>>,
  field: TagField,
): Promise<string[]> {
  const query =
    field === "tech_stack"
      ? supabase.from("projects").select("tech_stack")
      : field === "tags"
        ? supabase.from("posts").select("tags")
        : supabase.from("research_papers").select("topics");
  const { data, error } = await query;
  if (error) throw error;
  return (data as Record<TagField, string[]>[]).flatMap(
    (row) => row[field] ?? [],
  );
}

export type AdminTagOption = { name: string; iconUrl: string | null };

/**
 * Tag picker options for an editor field: every tag in use for that field
 * plus every kind name, lowercased and sorted, with kind icons attached.
 */
export async function adminTagOptions(
  field: TagField,
): Promise<AdminTagOption[]> {
  unstable_noStore();
  const supabase = await createClient();
  const [used, { data: kinds, error }] = await Promise.all([
    tagsInUse(supabase, field),
    supabase.from("tag_kinds").select("name, icon_url"),
  ]);
  if (error) throw error;

  const icons = new Map(
    kinds.map((kind) => [kind.name.toLowerCase(), kind.icon_url]),
  );
  const names = new Set([...used.map((tag) => tag.toLowerCase()), ...icons.keys()]);
  return [...names]
    .sort()
    .map((name) => ({ name, iconUrl: icons.get(name) ?? null }));
}

/** Distinct tags in use across projects, posts and papers (lowercased, sorted). */
export async function adminListContentTags(): Promise<string[]> {
  unstable_noStore();
  const supabase = await createClient();
  const perField = await Promise.all([
    tagsInUse(supabase, "tech_stack"),
    tagsInUse(supabase, "tags"),
    tagsInUse(supabase, "topics"),
  ]);
  return [...new Set(perField.flat().map((tag) => tag.toLowerCase()))].sort();
}

export async function adminListPapers() {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_papers")
    .select("id, slug, title, status, published_at, download_count, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function adminGetPaper(id: string) {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_papers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type AdminComment = Tables<"comments"> & {
  profiles: Pick<Tables<"profiles">, "display_name" | "avatar_url"> | null;
  posts: Pick<Tables<"posts">, "slug" | "title"> | null;
};

export async function adminListComments() {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*, profiles(display_name, avatar_url), posts(slug, title)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data as AdminComment[];
}

export async function adminGetSettings() {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase.from("site_settings").select("*");
  if (error) throw error;
  return Object.fromEntries(data.map((row) => [row.key, row.value]));
}

export async function adminGetStats() {
  unstable_noStore();
  const supabase = await createClient();

  const [posts, papers, comments, hidden, downloads, resumeDownloads] =
    await Promise.all([
      supabase.from("posts").select("status, view_count"),
      supabase.from("research_papers").select("status, download_count"),
      supabase
        .from("comments")
        .select("status", { count: "exact", head: true }),
      supabase
        .from("comments")
        .select("status", { count: "exact", head: true })
        .eq("status", "hidden"),
      supabase
        .from("paper_downloads")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("resume_downloads")
        .select("id", { count: "exact", head: true }),
    ]);

  const totalViews = (posts.data ?? []).reduce(
    (sum, p) => sum + (p.view_count ?? 0),
    0,
  );
  const publishedPosts = (posts.data ?? []).filter(
    (p) => p.status === "published",
  ).length;

  return {
    posts: posts.data?.length ?? 0,
    publishedPosts,
    totalViews,
    papers: papers.data?.length ?? 0,
    totalDownloads: downloads.count ?? 0,
    totalResumeDownloads: resumeDownloads.count ?? 0,
    comments: comments.count ?? 0,
    hiddenComments: hidden.count ?? 0,
  };
}

/* ------------------------------ analytics ------------------------------- */

/** One UTC day of the downloads chart. */
export type DownloadDay = { date: string; papers: number; resume: number };

export type DownloadEvent = {
  id: string;
  kind: "paper" | "resume";
  /** Paper title, or "Resume". */
  label: string;
  /** Paper slug; null for the resume. */
  slug: string | null;
  at: string;
  country: string | null;
  referrer: string | null;
  /** Display name when the downloader was signed in, else null. */
  who: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC calendar day, `YYYY-MM-DD`. */
function utcDay(iso: string) {
  return iso.slice(0, 10);
}

/**
 * Everything the admin dashboard plots.
 *
 * Downloads are bucketed by UTC day in JS rather than SQL: the window is
 * bounded to `days`, so this reads at most a few hundred rows and avoids a
 * materialised view that would need its own migration to reshape.
 *
 * `paper_downloads.user_id` references `auth.users`, not `profiles`, so
 * PostgREST can't embed the display name — the names are fetched in a second
 * pass keyed on the ids actually present.
 */
export async function adminGetAnalytics(days = 30) {
  unstable_noStore();
  const supabase = await createClient();

  const since = new Date(Date.now() - (days - 1) * DAY_MS);
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const [papers, resume, allPapers, posts] = await Promise.all([
    supabase
      .from("paper_downloads")
      .select(
        "id, downloaded_at, country, referrer, user_id, research_papers(slug, title)",
      )
      .gte("downloaded_at", sinceIso)
      .order("downloaded_at", { ascending: false }),
    supabase
      .from("resume_downloads")
      .select("id, downloaded_at, country, referrer, user_id")
      .gte("downloaded_at", sinceIso)
      .order("downloaded_at", { ascending: false }),
    // Published only: an unpublished draft can't have been downloaded, so it
    // would only ever pad the list with zeroes.
    supabase
      .from("research_papers")
      .select("slug, title, download_count")
      .eq("status", "published")
      .order("download_count", { ascending: false })
      .limit(5),
    supabase
      .from("posts")
      .select("slug, title, view_count, status")
      .eq("status", "published")
      .order("view_count", { ascending: false })
      .limit(5),
  ]);

  if (papers.error) throw papers.error;
  if (resume.error) throw resume.error;
  if (allPapers.error) throw allPapers.error;
  if (posts.error) throw posts.error;

  // Resolve display names for the (few) downloads that were signed in.
  const userIds = [
    ...new Set(
      [...papers.data, ...resume.data]
        .map((row) => row.user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const names = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    if (error) throw error;
    for (const profile of profiles ?? []) {
      names.set(profile.id, profile.display_name);
    }
  }

  const events: DownloadEvent[] = [
    ...papers.data.map((row) => ({
      id: `paper-${row.id}`,
      kind: "paper" as const,
      label: row.research_papers?.title ?? "Unknown paper",
      slug: row.research_papers?.slug ?? null,
      at: row.downloaded_at,
      country: row.country,
      referrer: row.referrer,
      who: row.user_id ? (names.get(row.user_id) ?? null) : null,
    })),
    ...resume.data.map((row) => ({
      id: `resume-${row.id}`,
      kind: "resume" as const,
      label: "Resume",
      slug: null,
      at: row.downloaded_at,
      country: row.country,
      referrer: row.referrer,
      who: row.user_id ? (names.get(row.user_id) ?? null) : null,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  // Zero-filled so quiet days are visible as gaps rather than collapsed out.
  const buckets = new Map<string, DownloadDay>();
  for (let i = 0; i < days; i++) {
    const date = new Date(since.getTime() + i * DAY_MS)
      .toISOString()
      .slice(0, 10);
    buckets.set(date, { date, papers: 0, resume: 0 });
  }
  for (const event of events) {
    const bucket = buckets.get(utcDay(event.at));
    if (bucket) bucket[event.kind === "paper" ? "papers" : "resume"] += 1;
  }

  // Country mix across both download kinds, busiest first.
  const countries = new Map<string, number>();
  for (const event of events) {
    const key = event.country ?? "Unknown";
    countries.set(key, (countries.get(key) ?? 0) + 1);
  }

  return {
    days,
    series: [...buckets.values()],
    events,
    recentPaperDownloads: papers.data.length,
    recentResumeDownloads: resume.data.length,
    topPapers: allPapers.data,
    topPosts: posts.data,
    topCountries: [...countries.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  };
}

/* ------------------------------ datasets -------------------------------- */

export async function adminListDatasets() {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("datasets")
    // The embed is disambiguated by constraint name: `datasets` and
    // `dataset_versions` reference each other (versions point at their
    // dataset, the dataset points at its current version), so without the
    // hint PostgREST resolves the wrong direction and returns one row.
    .select(
      "id, slug, name, status, updated_at, current_version_id, dataset_versions!dataset_versions_dataset_id_fkey(id, version, row_count)",
    )
    .order("updated_at", { ascending: false });
  if (error) throw error;

  // Row and column counts come from the current version, not the newest one:
  // a rollback must be reflected in the list.
  return data.map((dataset) => {
    const current = dataset.dataset_versions.find(
      (version) => version.id === dataset.current_version_id,
    );
    return {
      ...dataset,
      versionCount: dataset.dataset_versions.length,
      currentVersion: current?.version ?? null,
      rowCount: current?.row_count ?? 0,
    };
  });
}

export async function adminGetDataset(id: string) {
  unstable_noStore();
  const supabase = await createClient();

  const [{ data: dataset, error }, { data: versions, error: versionsError }] =
    await Promise.all([
      supabase.from("datasets").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("dataset_versions")
        .select("id, version, row_count, checksum, source_name, note, created_at")
        .eq("dataset_id", id)
        .order("version", { ascending: false }),
    ]);
  if (error) throw error;
  if (versionsError) throw versionsError;
  if (!dataset) return null;

  // Only the served version's payload is fetched; the history list carries
  // metadata alone so opening the page never pulls every past payload.
  const currentVersion = dataset.current_version_id
    ? await supabase
        .from("dataset_versions")
        .select("id, version, columns, data")
        .eq("id", dataset.current_version_id)
        .maybeSingle()
    : null;
  if (currentVersion?.error) throw currentVersion.error;

  return {
    ...dataset,
    versions: versions ?? [],
    current: currentVersion?.data ?? null,
  };
}

/** Charts that would break if this dataset were deleted or re-imported. */
export async function adminDatasetUsage(id: string) {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chart_datasets")
    .select("charts(id, slug, title, status)")
    .eq("dataset_id", id);
  if (error) throw error;
  return (data ?? []).flatMap((row) => (row.charts ? [row.charts] : []));
}

/* ------------------------------- charts --------------------------------- */

export async function adminListCharts() {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charts")
    .select("id, slug, title, status, interactive, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function adminGetChart(id: string) {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Slug, name and column list for every dataset, for the chart editor's pickers. */
export async function adminDatasetOptions() {
  unstable_noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("datasets")
    .select(
      "slug, name, current_version_id, dataset_versions!dataset_versions_dataset_id_fkey(id, columns)",
    )
    .order("name", { ascending: true });
  if (error) throw error;

  return data.map((dataset) => ({
    slug: dataset.slug,
    name: dataset.name,
    columns:
      dataset.dataset_versions.find(
        (version) => version.id === dataset.current_version_id,
      )?.columns ?? [],
  }));
}
