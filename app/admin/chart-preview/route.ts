import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/actions/guard";
import { datasetPayloadSchema, type DatasetPayload } from "@/lib/charts/dataset";
import { renderSvg } from "@/lib/charts/render";

/**
 * Live figure preview for the chart editor.
 *
 * Renders with the same code path as the published page, so what the editor
 * shows is what the article will show. Same shape as `/admin/mdx-preview`:
 * admin-only, and a spec that will not compile returns 422 with the compiler's
 * message, because a broken spec is the normal state while editing one.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    spec?: unknown;
    bindings?: Record<string, { slug: string; version?: number | null }>;
  };
  if (!body.spec || typeof body.spec !== "object") {
    return NextResponse.json({ error: "spec required" }, { status: 400 });
  }

  const { supabase } = await requireAdmin();
  const bindings = body.bindings ?? {};
  const slugs = [...new Set(Object.values(bindings).map((b) => b.slug))];

  const data: Record<string, DatasetPayload> = {};
  if (slugs.length > 0) {
    const { data: datasets, error } = await supabase
      .from("datasets")
      .select(
        "slug, current_version_id, dataset_versions!dataset_versions_dataset_id_fkey(id, columns, data)",
      )
      .in("slug", slugs);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    for (const [name, binding] of Object.entries(bindings)) {
      const dataset = datasets?.find((d) => d.slug === binding.slug);
      const version = dataset?.dataset_versions.find(
        (v) => v.id === dataset.current_version_id,
      );
      if (!version) continue;
      const parsed = datasetPayloadSchema.safeParse({
        columns: version.columns,
        data: version.data,
      });
      if (parsed.success) data[name] = parsed.data;
    }
  }

  try {
    const svg = await renderSvg(
      body.spec as Record<string, unknown>,
      data,
      "wide",
    );
    return NextResponse.json({ svg, datasets: Object.keys(data) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not render" },
      { status: 422 },
    );
  }
}
