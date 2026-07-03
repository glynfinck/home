import { PaperEditor } from "@/components/admin/paper-editor";
import { adminTagOptions } from "@/lib/data/admin";

export default async function NewPaperPage() {
  const tagOptions = await adminTagOptions("topics");

  return (
    <PaperEditor
      tagOptions={tagOptions}
      initial={{
        title: "",
        slug: "",
        abstract: "",
        content: "",
        pdf_path: "",
        pdf_size_bytes: null,
        topics: [],
        status: "draft",
        published_at: null,
      }}
    />
  );
}
