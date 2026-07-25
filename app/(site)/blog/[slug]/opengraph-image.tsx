import { ImageResponse } from "next/og";

import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  clamp,
  loadOgFonts,
  ogFooter,
} from "@/lib/og";
import { getPostBySlug } from "@/lib/data/posts";
import { formatDate } from "@/lib/format";

export const alt = "Blog post on glyn.dev";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, fonts] = await Promise.all([getPostBySlug(slug), loadOgFonts()]);

  // A missing post still has to return an image: this route is generated
  // independently of the page, so throwing here would surface as a broken
  // card rather than a 404.
  if (!post) {
    return new ImageResponse(
      <OgFrame eyebrow="~/blog" title="Post not found" footer="glyn.dev" />,
      { ...size, fonts },
    );
  }

  return new ImageResponse(
    (
      <OgFrame
        eyebrow={`~/blog/${post.slug}`}
        title={post.title}
        subtitle={post.excerpt ? clamp(post.excerpt, 165) : undefined}
        footer={ogFooter(
          formatDate(post.published_at),
          post.reading_minutes ? `${post.reading_minutes} min read` : null,
          post.tags.slice(0, 3).join(", ") || null,
        )}
      />
    ),
    { ...size, fonts },
  );
}
