import { notFound } from "next/navigation";

import { ChartEditor } from "@/components/admin/chart-editor";
import type { ColumnDef } from "@/lib/charts/dataset";
import { parseBindings } from "@/lib/data/charts";
import { adminDatasetOptions, adminGetChart } from "@/lib/data/admin";

export default async function EditChartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [chart, datasets] = await Promise.all([
    adminGetChart(id),
    adminDatasetOptions(),
  ]);
  if (!chart) notFound();

  return (
    <ChartEditor
      datasets={datasets.map((dataset) => ({
        ...dataset,
        columns: (dataset.columns ?? []) as unknown as ColumnDef[],
      }))}
      initial={{
        id: chart.id,
        slug: chart.slug,
        title: chart.title,
        caption: chart.caption ?? "",
        spec: JSON.stringify(chart.spec, null, 2),
        bindings: Object.fromEntries(
          Object.entries(parseBindings(chart.bindings)).map(([name, binding]) => [
            name,
            { slug: binding.slug, version: binding.version ?? null },
          ]),
        ),
        status: chart.status,
      }}
    />
  );
}
