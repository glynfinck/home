import { DatasetEditor } from "@/components/admin/dataset-editor";

export default function NewDatasetPage() {
  return (
    <DatasetEditor
      initial={{
        slug: "",
        name: "",
        description: "",
        source: "",
        status: "draft",
      }}
    />
  );
}
