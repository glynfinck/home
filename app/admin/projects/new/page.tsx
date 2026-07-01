import { ProjectEditor } from "@/components/admin/project-editor";

export default function NewProjectPage() {
  return (
    <ProjectEditor
      initial={{
        title: "",
        slug: "",
        summary: "",
        description: "",
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
