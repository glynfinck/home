import { PaperEditor } from "@/components/admin/paper-editor";

export default function NewPaperPage() {
  return (
    <PaperEditor
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
