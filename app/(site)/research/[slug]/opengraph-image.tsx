import { ImageResponse } from "next/og";

import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  clamp,
  loadOgFonts,
  ogFooter,
} from "@/lib/og";
import { getPaperBySlug } from "@/lib/data/research";
import { formatDate } from "@/lib/format";

export const alt = "Research paper on glyn.dev";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [paper, fonts] = await Promise.all([getPaperBySlug(slug), loadOgFonts()]);

  if (!paper) {
    return new ImageResponse(
      <OgFrame eyebrow="~/research" title="Paper not found" footer="glyn.dev" />,
      { ...size, fonts },
    );
  }

  return new ImageResponse(
    (
      <OgFrame
        eyebrow={`~/research/${paper.slug}`}
        title={paper.title}
        subtitle={paper.abstract ? clamp(paper.abstract, 165) : undefined}
        footer={ogFooter(
          formatDate(paper.published_at),
          "PDF",
          paper.topics.slice(0, 3).join(", ") || null,
        )}
      />
    ),
    { ...size, fonts },
  );
}
