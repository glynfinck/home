import { ImageResponse } from "next/og";

import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  clamp,
  loadOgFonts,
  ogFooter,
} from "@/lib/og";
import { getProjectBySlug } from "@/lib/data/projects";

export const alt = "Project on glyn.dev";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [project, fonts] = await Promise.all([
    getProjectBySlug(slug),
    loadOgFonts(),
  ]);

  if (!project) {
    return new ImageResponse(
      <OgFrame eyebrow="~/projects" title="Project not found" footer="glyn.dev" />,
      { ...size, fonts },
    );
  }

  return new ImageResponse(
    (
      <OgFrame
        eyebrow={`~/projects/${project.slug}`}
        title={project.title}
        subtitle={project.summary ? clamp(project.summary, 165) : undefined}
        footer={ogFooter(...project.tech_stack.slice(0, 4))}
      />
    ),
    { ...size, fonts },
  );
}
