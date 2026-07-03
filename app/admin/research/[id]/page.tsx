import { notFound } from "next/navigation";

import { PaperEditor } from "@/components/admin/paper-editor";
import { adminGetPaper, adminTagOptions } from "@/lib/data/admin";

export default async function EditPaperPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [paper, tagOptions] = await Promise.all([
    adminGetPaper(id),
    adminTagOptions("topics"),
  ]);
  if (!paper) notFound();

  return (
    <PaperEditor
      tagOptions={tagOptions}
      initial={{
        id: paper.id,
        title: paper.title,
        slug: paper.slug,
        abstract: paper.abstract,
        content: paper.content ?? "",
        pdf_path: paper.pdf_path,
        pdf_size_bytes: paper.pdf_size_bytes,
        topics: paper.topics,
        status: paper.status,
        published_at: paper.published_at,
      }}
    />
  );
}
