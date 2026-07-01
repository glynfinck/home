import "katex/dist/katex.min.css";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, FileText } from "lucide-react";

import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Comments } from "@/components/site/comments/comments";
import { ViewTracker } from "@/components/site/view-tracker";
import { getPapersForPost, getPostBySlug } from "@/lib/data/posts";
import { formatDate } from "@/lib/format";
import { Mdx } from "@/lib/mdx";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  // Thrown here (pre-stream) so the response carries a real 404 status
  if (!post) notFound();

  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      type: "article",
      publishedTime: post.published_at ?? undefined,
      ...(post.cover_image_url ? { images: [post.cover_image_url] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const papers = await getPapersForPost(post.id);

  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-16">
      <ViewTracker slug={post.slug} />

      <Link
        href="/blog"
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Blog
      </Link>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-muted-foreground">
          <time dateTime={post.published_at ?? undefined}>
            {formatDate(post.published_at)}
          </time>
          {post.reading_minutes ? <span>· {post.reading_minutes} min read</span> : null}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {post.title}
        </h1>
        {post.excerpt ? (
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        ) : null}
        {post.tags.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary" asChild>
                <Link href={`/blog/tag/${encodeURIComponent(tag)}`}>{tag}</Link>
              </Badge>
            ))}
          </div>
        ) : null}
      </header>

      <div className="mt-10 border-t border-border/60 pt-10">
        <Mdx source={post.content} />
      </div>

      {papers.length > 0 ? (
        <aside className="mt-12 border-t border-border/60 pt-8">
          <p className="font-mono text-xs tracking-widest text-brand uppercase">
            Referenced research
          </p>
          <div className="mt-4 space-y-3">
            {papers.map((paper) => (
              <div
                key={paper.id}
                className="flex items-start justify-between gap-4 rounded-lg border bg-card/40 p-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/research/${paper.slug}`}
                    className="flex items-center gap-2 font-medium tracking-tight transition-colors duration-150 hover:text-brand"
                  >
                    <FileText className="size-4 shrink-0 text-brand" />
                    {paper.title}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {paper.abstract}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <a href={`/api/download/${paper.slug}`}>
                    PDF <ArrowUpRight className="size-3.5" />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </aside>
      ) : null}

      <Suspense
        fallback={
          <div className="mt-12 space-y-3 border-t border-border/60 pt-8">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-20 w-full" />
          </div>
        }
      >
        <Comments postId={post.id} postSlug={post.slug} />
      </Suspense>
    </article>
  );
}
