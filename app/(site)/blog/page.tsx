import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { PostRow } from "@/components/site/post-card";
import { TypedTextInView } from "@/components/site/typed-text-in-view";
import { getAllTags, getPublishedPosts } from "@/lib/data/posts";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Writing on software engineering, research, and the experiments in between.",
};

export default async function BlogPage() {
  const [posts, tags] = await Promise.all([getPublishedPosts(), getAllTags()]);

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <p className="font-mono text-xs tracking-widest text-brand uppercase">
        <TypedTextInView text="Blog" />
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Writing</h1>
      <p className="mt-3 text-muted-foreground">
        Software engineering, research, and the experiments in between.
      </p>

      {tags.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {tags.map(({ tag, count }) => (
            <Badge key={tag} variant="secondary" asChild>
              <Link href={`/blog/tag/${encodeURIComponent(tag)}`}>
                {tag} <span className="text-muted-foreground">{count}</span>
              </Link>
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-6 divide-y divide-border/60 border-t border-border/60">
        {posts.map((post) => (
          <PostRow key={post.id} post={post} />
        ))}
      </div>
      {posts.length === 0 ? (
        <p className="mt-10 text-muted-foreground">No posts yet.</p>
      ) : null}
    </section>
  );
}
