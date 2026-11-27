import { notFound } from "next/navigation";

import { ProjectEditor } from "@/components/admin/project-editor";
import { adminGetProject, adminTagOptions } from "@/lib/data/admin";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, tagOptions, topicOptions] = await Promise.all([
    adminGetProject(id),
    adminTagOptions("stack"),
    adminTagOptions("topics"),
  ]);
  if (!project) notFound();

  return (
    <ProjectEditor
      tagOptions={tagOptions}
      topicOptions={topicOptions}
      initial={{
        id: project.id,
        title: project.title,
        slug: project.slug,
        summary: project.summary,
        description: project.description ?? "",
        content: project.content ?? "",
        tech_stack: project.tech_stack,
        topics: project.topics,
        cover_image_url: project.cover_image_url ?? "",
        page_image_url: project.page_image_url ?? "",
        github_url: project.github_url ?? "",
        live_url: project.live_url ?? "",
        featured: project.featured,
        sort_order: project.sort_order,
        year: project.year,
        status: project.status,
      }}
    />
  );
}
