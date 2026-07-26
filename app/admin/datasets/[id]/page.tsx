import { notFound } from "next/navigation";

import { DatasetEditor } from "@/components/admin/dataset-editor";
import { datasetPayloadSchema } from "@/lib/charts/dataset";
import { adminDatasetUsage, adminGetDataset } from "@/lib/data/admin";

export default async function EditDatasetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [dataset, usedBy] = await Promise.all([
    adminGetDataset(id),
    adminDatasetUsage(id),
  ]);
  if (!dataset) notFound();

  // A payload whose shape no longer validates is shown as "no data" rather
  // than crashing the editor, which is the one place it can be fixed.
  const parsed = dataset.current
    ? datasetPayloadSchema.safeParse({
        columns: dataset.current.columns,
        data: dataset.current.data,
      })
    : null;

  return (
    <DatasetEditor
      initial={{
        id: dataset.id,
        slug: dataset.slug,
        name: dataset.name,
        description: dataset.description ?? "",
        source: dataset.source ?? "",
        status: dataset.status,
      }}
      versions={dataset.versions}
      current={
        dataset.current && parsed?.success
          ? {
              id: dataset.current.id,
              version: dataset.current.version,
              payload: parsed.data,
            }
          : null
      }
      usedBy={usedBy}
    />
  );
}
