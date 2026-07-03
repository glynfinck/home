import { ProjectEditor } from "@/components/admin/project-editor";
import { adminTagOptions } from "@/lib/data/admin";

export default async function NewProjectPage() {
  const tagOptions = await adminTagOptions("tech_stack");

  return (
    <ProjectEditor
      tagOptions={tagOptions}
      initial={{
        title: "",
        slug: "",
        summary: "",
        description: "",
        content: "",
        tech_stack: [],
        cover_image_url: "",
        github_url: "",
        live_url: "",
        featured: false,
        sort_order: 0,
        status: "published",
      }}
    />
  );
}
