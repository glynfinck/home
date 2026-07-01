import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PostRow } from "@/components/site/post-card";
import { getPostsByTag } from "@/lib/data/posts";

type Props = { params: Promise<{ tag: string }> };

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
  const posts = await getPostsByTag(decoded);

  if (posts.length === 0) notFound();

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <Link
        href="/blog"
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Blog
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        <span className="text-brand">#</span>
        {decoded}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {posts.length} {posts.length === 1 ? "post" : "posts"}
      </p>
      <div className="mt-6 divide-y divide-border/60 border-t border-border/60">
        {posts.map((post) => (
          <PostRow key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
