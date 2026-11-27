import type { Metadata } from "next";
import { Suspense } from "react";

import { PostRowsSkeleton } from "@/components/site/loading-shell";
import { PostLog } from "@/components/site/post-log";
import { TagFilter } from "@/components/site/tag-filter";
import { getAllTags, getPublishedPosts } from "@/lib/data/posts";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Writing on software engineering, research, and the experiments in between.",
};

export default function BlogPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      {/* Reading width, but starting at the navbar's left edge like every
          other index, so the heading does not shift sideways between
          sections. */}
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">Writing</h1>
        <p className="mt-3 text-muted-foreground">
          Software engineering, research, and the experiments in between.
        </p>

        {/* Inline rather than a loading.tsx: a route-level loading file here
            would sit above [slug] and tag/[tag] and commit HTTP 200 before
            either could call notFound(). See components/site/loading-shell. */}
        <Suspense fallback={<PostRowsSkeleton command="ls blog/" />}>
          <PostList />
        </Suspense>
      </div>
    </section>
  );
}

async function PostList() {
  const [posts, tags] = await Promise.all([getPublishedPosts(), getAllTags()]);

  return (
    <>
      <div className="mt-6">
        <TagFilter tags={tags} total={posts.length} />
      </div>
      <PostLog posts={posts} className="mt-10" />
      {posts.length === 0 ? (
        <p className="mt-10 text-muted-foreground">No posts yet.</p>
      ) : null}
    </>
  );
}
