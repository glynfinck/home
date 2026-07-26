"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import {
  canonicalChecksum,
  datasetPayloadSchema,
  rowCount,
} from "@/lib/charts/dataset";
import { assertRenderableSpec, compileSpec } from "@/lib/charts/render";
import { requireAdmin } from "@/lib/actions/guard";
import { CACHE_TAGS } from "@/lib/data/settings";
import type { Json } from "@/types/database";

/**
 * Admin writes for datasets and charts.
 *
 * Mirrors `lib/actions/admin.ts`: guard, validate, write, revalidate, and
 * return a discriminated result rather than throwing at the form.
 *
 * Every path that changes what a figure draws also revalidates the article
 * pages, because charts are embedded in post bodies and their cached HTML
 * would otherwise keep the old numbers.
 */

export type ActionResult =
  | { ok: true; id?: string; message?: string }
  | { ok: false; error: string };

function failure(error: unknown, fallback: string): ActionResult {
  const message =
    error instanceof Error && /Not auth/.test(error.message)
      ? error.message
      : fallback;
  return { ok: false, error: message };
}

const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, digits, dashes");

const statusSchema = z.enum(["draft", "published", "archived"]);

/** Charts and articles both go stale when the numbers behind them move. */
function revalidateFigures(tags: string[]) {
  for (const tag of tags) updateTag(tag);
  revalidatePath("/blog/[slug]", "page");
  revalidatePath("/research/[slug]", "page");
}

/* ------------------------------ datasets -------------------------------- */

const datasetSchema = z.object({
  id: z.string().uuid().optional(),
  slug: slugSchema,
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim(),
  source: z.string().trim(),
  status: statusSchema,
});

export type DatasetInput = z.infer<typeof datasetSchema>;

export async function upsertDataset(input: DatasetInput): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const parsed = datasetSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }
    const { id, ...fields } = parsed.data;

    const row = {
      ...fields,
      description: fields.description || null,
      source: fields.source || null,
    };

    const query = id
      ? supabase.from("datasets").update(row).eq("id", id).select("id, slug")
      : supabase.from("datasets").insert(row).select("id, slug");
    const { data, error } = await query.single();
    if (error) {
      return {
        ok: false,
        error: error.code === "23505" ? "Slug already in use" : error.message,
      };
    }

    revalidateFigures([
      CACHE_TAGS.datasets,
      CACHE_TAGS.dataset(data.slug),
      CACHE_TAGS.charts,
    ]);
    return { ok: true, id: data.id };
  } catch (error) {
    return failure(error, "Could not save the dataset");
  }
}

const importSchema = z.object({
  datasetId: z.string().uuid(),
  payload: datasetPayloadSchema,
  sourceName: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export type ImportInput = z.infer<typeof importSchema>;

/**
 * Append a version and point the dataset at it.
 *
 * Identical data is a no-op rather than a new version: the checksum is what
 * decides, so re-running a generator whose output has not changed does not
 * fill the history with duplicates.
 */
export async function importDatasetVersion(
  input: ImportInput,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdmin();
    const parsed = importSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }
    const { datasetId, payload, sourceName, note } = parsed.data;

    const { data: dataset, error: datasetError } = await supabase
      .from("datasets")
      .select("id, slug, current_version_id")
      .eq("id", datasetId)
      .single();
    if (datasetError) return { ok: false, error: datasetError.message };

    const checksum = await canonicalChecksum(payload);

    const { data: versions, error: versionsError } = await supabase
      .from("dataset_versions")
      .select("id, version, checksum")
      .eq("dataset_id", datasetId)
      .order("version", { ascending: false });
    if (versionsError) return { ok: false, error: versionsError.message };

    const current = versions?.find((v) => v.id === dataset.current_version_id);
    if (current?.checksum === checksum) {
      return { ok: true, id: current.id, message: "Identical data, nothing imported" };
    }

    const nextVersion = (versions?.[0]?.version ?? 0) + 1;
    const { data: created, error } = await supabase
      .from("dataset_versions")
      .insert({
        dataset_id: datasetId,
        version: nextVersion,
        columns: payload.columns,
        data: payload.data,
        row_count: rowCount(payload),
        checksum,
        source_name: sourceName || null,
        note: note || null,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };

    const { error: pointerError } = await supabase
      .from("datasets")
      .update({ current_version_id: created.id })
      .eq("id", datasetId);
    if (pointerError) return { ok: false, error: pointerError.message };

    revalidateFigures([
      CACHE_TAGS.datasets,
      CACHE_TAGS.dataset(dataset.slug),
      CACHE_TAGS.charts,
    ]);
    return { ok: true, id: created.id, message: `Imported as version ${nextVersion}` };
  } catch (error) {
    return failure(error, "Could not import the data");
  }
}

export async function rollbackDataset(
  datasetId: string,
  versionId: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();

    // Checked rather than trusted: a version id from another dataset would
    // otherwise point a dataset at data that was never imported into it.
    const { data: version, error: versionError } = await supabase
      .from("dataset_versions")
      .select("id, version, dataset_id")
      .eq("id", versionId)
      .eq("dataset_id", datasetId)
      .maybeSingle();
    if (versionError) return { ok: false, error: versionError.message };
    if (!version) return { ok: false, error: "That version is not in this dataset" };

    const { data, error } = await supabase
      .from("datasets")
      .update({ current_version_id: versionId })
      .eq("id", datasetId)
      .select("slug")
      .single();
    if (error) return { ok: false, error: error.message };

    revalidateFigures([
      CACHE_TAGS.datasets,
      CACHE_TAGS.dataset(data.slug),
      CACHE_TAGS.charts,
    ]);
    return { ok: true, message: `Serving version ${version.version}` };
  } catch (error) {
    return failure(error, "Could not switch version");
  }
}

export async function deleteDataset(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { data: dataset } = await supabase
      .from("datasets")
      .select("slug")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase.from("datasets").delete().eq("id", id);
    if (error) {
      // The FK from chart_datasets is `on delete restrict` precisely so this
      // cannot orphan a published figure.
      return {
        ok: false,
        error:
          error.code === "23503"
            ? "A chart still uses this dataset. Delete the chart first."
            : error.message,
      };
    }

    revalidateFigures([
      CACHE_TAGS.datasets,
      ...(dataset ? [CACHE_TAGS.dataset(dataset.slug)] : []),
      CACHE_TAGS.charts,
    ]);
    return { ok: true };
  } catch (error) {
    return failure(error, "Could not delete the dataset");
  }
}

/* ------------------------------- charts --------------------------------- */

const bindingSchema = z.object({
  slug: slugSchema,
  version: z.number().int().positive().nullable().default(null),
});

const chartSchema = z.object({
  id: z.string().uuid().optional(),
  slug: slugSchema,
  title: z.string().trim().min(1, "Title is required"),
  caption: z.string().trim(),
  /** Raw JSON from the editor, so a syntax error is reported as one. */
  spec: z.string().min(1, "A spec is required"),
  bindings: z.record(z.string(), bindingSchema),
  status: statusSchema,
});

export type ChartInput = z.infer<typeof chartSchema>;

export async function upsertChart(input: ChartInput): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const parsed = chartSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }
    const { id, spec: specSource, bindings, ...fields } = parsed.data;

    let spec: Record<string, unknown>;
    try {
      spec = JSON.parse(specSource) as Record<string, unknown>;
    } catch (error) {
      return {
        ok: false,
        error: `The spec is not valid JSON: ${error instanceof Error ? error.message : "parse error"}`,
      };
    }

    // Compiling is the validation, because it is exactly what the renderer
    // will do. It is not exhaustive: Vega-Lite rejects structural problems (no
    // mark, an unknown mark, a malformed transform expression) but tolerates
    // some field-level ones, warning and falling back instead of throwing. The
    // live preview is what catches those, which is why it renders through this
    // same path rather than an approximation of it.
    try {
      assertRenderableSpec(spec);
      compileSpec({ ...spec, data: { values: [] }, width: 100, height: 100 });
    } catch (error) {
      return {
        ok: false,
        error: `The spec will not compile: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    const slugs = [...new Set(Object.values(bindings).map((b) => b.slug))];
    const { data: datasets, error: datasetError } = await supabase
      .from("datasets")
      .select("id, slug")
      .in("slug", slugs.length > 0 ? slugs : ["__none__"]);
    if (datasetError) return { ok: false, error: datasetError.message };

    const missing = slugs.filter(
      (slug) => !(datasets ?? []).some((dataset) => dataset.slug === slug),
    );
    if (missing.length > 0) {
      return { ok: false, error: `No such dataset: ${missing.join(", ")}` };
    }

    const row = {
      ...fields,
      caption: fields.caption || null,
      // Both are jsonb columns; the generated `Json` type cannot express an
      // arbitrary validated object, and these have already been parsed.
      spec: spec as Json,
      bindings: bindings as Json,
      // Derived rather than asked for: a spec with parameters is exactly one
      // that ships a control.
      interactive: Array.isArray(spec.params) && spec.params.length > 0,
    };

    const query = id
      ? supabase.from("charts").update(row).eq("id", id).select("id, slug")
      : supabase.from("charts").insert(row).select("id, slug");
    const { data, error } = await query.single();
    if (error) {
      return {
        ok: false,
        error: error.code === "23505" ? "Slug already in use" : error.message,
      };
    }

    // `chart_datasets` mirrors `bindings`; it exists so the FK can refuse to
    // delete a dataset a figure still draws.
    await supabase.from("chart_datasets").delete().eq("chart_id", data.id);
    if (datasets && datasets.length > 0) {
      const { error: linkError } = await supabase.from("chart_datasets").insert(
        datasets.map((dataset) => ({ chart_id: data.id, dataset_id: dataset.id })),
      );
      if (linkError) return { ok: false, error: linkError.message };
    }

    revalidateFigures([CACHE_TAGS.charts, CACHE_TAGS.chart(data.slug)]);
    return { ok: true, id: data.id };
  } catch (error) {
    return failure(error, "Could not save the chart");
  }
}

export async function deleteChart(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { data: chart } = await supabase
      .from("charts")
      .select("slug")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase.from("charts").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidateFigures([
      CACHE_TAGS.charts,
      ...(chart ? [CACHE_TAGS.chart(chart.slug)] : []),
    ]);
    return { ok: true };
  } catch (error) {
    return failure(error, "Could not delete the chart");
  }
}
