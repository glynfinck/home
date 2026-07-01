import { notFound } from "next/navigation";

import { PostEditor } from "@/components/admin/post-editor";
import { adminGetPost, adminListPapers } from "@/lib/data/admin";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [post, papers] = await Promise.all([
    adminGetPost(id),
    adminListPapers(),
  ]);
  if (!post) notFound();

  return (
    <PostEditor
      initial={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt ?? "",
        content: post.content,
        cover_image_url: post.cover_image_url ?? "",
        tags: post.tags,
        status: post.status,
        published_at: post.published_at,
        paperIds: post.paperIds,
      }}
      papers={papers.map((p) => ({ id: p.id, title: p.title }))}
    />
  );
}
