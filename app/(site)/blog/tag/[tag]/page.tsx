import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostLog } from "@/components/site/post-log";
import { TagFilter } from "@/components/site/tag-filter";
import { getAllTags, getPostsByTag, getPublishedPosts } from "@/lib/data/posts";

type Props = { params: Promise<{ tag: string }> };

/**
 * Prerendered at build. Tag pages are the cheapest to generate and the most
 * likely to be clicked from a post's badge row, which makes them the clearest
 * win from prefetching.
 */
export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map(({ tag }) => ({ tag: encodeURIComponent(tag) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  return {
    title: `#${decoded}`,
    description: `Posts tagged ${decoded}.`,
  };
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const [posts, tags, all] = await Promise.all([
    getPostsByTag(decoded),
    getAllTags(),
    getPublishedPosts(),
  ]);

  if (posts.length === 0) notFound();

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">
          <span className="text-brand">#</span>
          {decoded}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </p>
        <div className="mt-6">
          <TagFilter tags={tags} total={all.length} active={decoded} />
        </div>
        <PostLog posts={posts} className="mt-10" />
      </div>
    </section>
  );
}
