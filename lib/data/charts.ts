import { unstable_cache } from "next/cache";

import { datasetPayloadSchema, type DatasetPayload } from "@/lib/charts/dataset";
import { CACHE_TAGS } from "@/lib/data/settings";
import { safeRead } from "@/lib/data/util";
import { supabasePublic } from "@/lib/supabase/public";
import type { Tables } from "@/types/helpers";

export type Chart = Tables<"charts">;
export type Dataset = Tables<"datasets">;

/**
 * A chart's `bindings`: the dataset name a spec refers to, mapped to the
 * dataset it draws. `version: null` follows the dataset's current version; a
 * number pins it, so a published article keeps plotting the numbers it was
 * written about even after the dataset moves on.
 */
export type ChartBinding = { slug: string; version?: number | null };
export type ChartBindings = Record<string, ChartBinding>;

export type ResolvedDataset = {
  slug: string;
  name: string;
  source: string | null;
  version: number;
  payload: DatasetPayload;
};

export type ResolvedChart = {
  chart: Chart;
  /** Keyed by the name the spec uses, not by dataset slug. */
  data: Record<string, ResolvedDataset>;
};

export function parseBindings(value: Chart["bindings"]): ChartBindings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const bindings: ChartBindings = {};
  for (const [name, binding] of Object.entries(value)) {
    if (!binding || typeof binding !== "object" || Array.isArray(binding)) continue;
    const { slug, version } = binding as { slug?: unknown; version?: unknown };
    if (typeof slug !== "string" || !slug) continue;
    bindings[name] = {
      slug,
      version: typeof version === "number" ? version : null,
    };
  }
  return bindings;
}

/**
 * Resolve every dataset a chart binds, in two round trips.
 *
 * The first selects version metadata only. Selecting the payloads up front
 * would drag every historical version of every bound dataset across the wire
 * to discard all but one of each.
 */
async function resolveBindings(
  bindings: ChartBindings,
): Promise<Record<string, ResolvedDataset>> {
  const slugs = [...new Set(Object.values(bindings).map((b) => b.slug))];
  if (slugs.length === 0) return {};

  const { data: datasets, error } = await supabasePublic
    .from("datasets")
    .select("id, slug, name, source, current_version_id")
    .in("slug", slugs);
  if (error) throw error;
  if (!datasets || datasets.length === 0) return {};

  const { data: versionMeta, error: metaError } = await supabasePublic
    .from("dataset_versions")
    .select("id, dataset_id, version")
    .in(
      "dataset_id",
      datasets.map((dataset) => dataset.id),
    );
  if (metaError) throw metaError;

  const bySlug = new Map(datasets.map((dataset) => [dataset.slug, dataset]));

  // Which version row each binding actually wants.
  const wanted = new Map<string, string>(); // binding name -> version id
  for (const [name, binding] of Object.entries(bindings)) {
    const dataset = bySlug.get(binding.slug);
    if (!dataset) continue;

    const versionId =
      binding.version == null
        ? dataset.current_version_id
        : (versionMeta ?? []).find(
            (row) =>
              row.dataset_id === dataset.id && row.version === binding.version,
          )?.id;

    if (versionId) wanted.set(name, versionId);
  }

  const versionIds = [...new Set(wanted.values())];
  if (versionIds.length === 0) return {};

  const { data: payloads, error: payloadError } = await supabasePublic
    .from("dataset_versions")
    .select("id, dataset_id, version, columns, data")
    .in("id", versionIds);
  if (payloadError) throw payloadError;

  const byId = new Map((payloads ?? []).map((row) => [row.id, row]));
  const byDatasetId = new Map(datasets.map((dataset) => [dataset.id, dataset]));

  const resolved: Record<string, ResolvedDataset> = {};
  for (const [name, versionId] of wanted) {
    const row = byId.get(versionId);
    if (!row) continue;
    const dataset = byDatasetId.get(row.dataset_id);
    if (!dataset) continue;

    // A payload that no longer matches its schema is dropped rather than
    // rendered: a figure missing entirely is a visible bug, a figure drawn
    // from a half-valid payload is an invisible one.
    const parsed = datasetPayloadSchema.safeParse({
      columns: row.columns,
      data: row.data,
    });
    if (!parsed.success) continue;

    resolved[name] = {
      slug: dataset.slug,
      name: dataset.name,
      source: dataset.source,
      version: row.version,
      payload: parsed.data,
    };
  }
  return resolved;
}

export function getChartBySlug(slug: string): Promise<ResolvedChart | null> {
  return safeRead(
    `chart:${slug}`,
    unstable_cache(
      async (): Promise<ResolvedChart | null> => {
        const { data: chart, error } = await supabasePublic
          .from("charts")
          .select("*")
          .eq("slug", slug)
          .eq("status", "published")
          .maybeSingle();
        if (error) throw error;
        if (!chart) return null;

        return { chart, data: await resolveBindings(parseBindings(chart.bindings)) };
      },
      ["chart", slug],
      { tags: [CACHE_TAGS.charts, CACHE_TAGS.chart(slug)], revalidate: 3600 },
    ),
    null,
  );
}

export function getDatasetBySlug(slug: string): Promise<ResolvedDataset | null> {
  return safeRead(
    `dataset:${slug}`,
    unstable_cache(
      async (): Promise<ResolvedDataset | null> => {
        const resolved = await resolveBindings({ main: { slug } });
        return resolved.main ?? null;
      },
      ["dataset", slug],
      { tags: [CACHE_TAGS.datasets, CACHE_TAGS.dataset(slug)], revalidate: 3600 },
    ),
    null,
  );
}
