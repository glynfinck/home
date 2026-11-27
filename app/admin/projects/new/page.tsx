import { ProjectEditor } from "@/components/admin/project-editor";
import { adminTagOptions } from "@/lib/data/admin";

export default async function NewProjectPage() {
  const [tagOptions, topicOptions] = await Promise.all([
    adminTagOptions("stack"),
    adminTagOptions("topics"),
  ]);

  return (
    <ProjectEditor
      tagOptions={tagOptions}
      topicOptions={topicOptions}
      initial={{
        title: "",
        slug: "",
        summary: "",
        description: "",
        content: "",
        tech_stack: [],
        topics: [],
        cover_image_url: "",
        page_image_url: "",
        github_url: "",
        live_url: "",
        featured: false,
        sort_order: 0,
        year: new Date().getFullYear(),
        status: "published",
      }}
    />
  );
}
