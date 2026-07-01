import { notFound } from "next/navigation";

import { ProjectEditor } from "@/components/admin/project-editor";
import { adminGetProject } from "@/lib/data/admin";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await adminGetProject(id);
  if (!project) notFound();

  return (
    <ProjectEditor
      initial={{
        id: project.id,
        title: project.title,
        slug: project.slug,
        summary: project.summary,
        description: project.description ?? "",
        tech_stack: project.tech_stack,
        cover_image_url: project.cover_image_url ?? "",
        github_url: project.github_url ?? "",
        live_url: project.live_url ?? "",
        featured: project.featured,
        sort_order: project.sort_order,
        status: project.status,
      }}
    />
  );
}
