import { PostEditor } from "@/components/admin/post-editor";
import { adminListPapers, adminTagOptions } from "@/lib/data/admin";

export default async function NewPostPage() {
  const [papers, tagOptions, stackOptions] = await Promise.all([
    adminListPapers(),
    adminTagOptions("topics"),
    adminTagOptions("stack"),
  ]);

  return (
    <PostEditor
      initial={{
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        cover_image_url: "",
        tags: [],
        tech_stack: [],
        status: "draft",
        published_at: null,
        paperIds: [],
      }}
      papers={papers.map((p) => ({ id: p.id, title: p.title }))}
      tagOptions={tagOptions}
      stackOptions={stackOptions}
    />
  );
}
