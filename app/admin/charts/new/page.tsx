import { ChartEditor } from "@/components/admin/chart-editor";
import { adminDatasetOptions } from "@/lib/data/admin";
import type { ColumnDef } from "@/lib/charts/dataset";

const STARTER = JSON.stringify(
  {
    $schema: "https://vega.github.io/schema/vega-lite/v6.json",
    data: { name: "main" },
    mark: { type: "line" },
    encoding: {
      x: { field: "x", type: "quantitative" },
      y: { field: "y", type: "quantitative" },
    },
  },
  null,
  2,
);

export default async function NewChartPage() {
  const datasets = await adminDatasetOptions();

  return (
    <ChartEditor
      datasets={datasets.map((dataset) => ({
        ...dataset,
        columns: (dataset.columns ?? []) as unknown as ColumnDef[],
      }))}
      initial={{
        slug: "",
        title: "",
        caption: "",
        spec: STARTER,
        bindings: { main: { slug: datasets[0]?.slug ?? "", version: null } },
        status: "draft",
      }}
    />
  );
}
