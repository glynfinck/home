import "katex/dist/katex.min.css";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPaperBySlug, getPostsForPaper } from "@/lib/data/research";
import { formatBytes, formatDate } from "@/lib/format";
import { Mdx } from "@/lib/mdx";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const paper = await getPaperBySlug(slug);
  // Thrown here (pre-stream) so the response carries a real 404 status
  if (!paper) notFound();

  return {
    title: paper.title,
    description: paper.abstract,
    openGraph: {
      title: paper.title,
      description: paper.abstract,
      type: "article",
      publishedTime: paper.published_at ?? undefined,
    },
  };
}

export default async function ResearchPaperPage({ params }: Props) {
  const { slug } = await params;
  const paper = await getPaperBySlug(slug);
  if (!paper) notFound();

  const posts = await getPostsForPaper(paper.id);

  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-16">
      <Link
        href="/research"
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Research
      </Link>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-muted-foreground">
          <time dateTime={paper.published_at ?? undefined}>
            {formatDate(paper.published_at)}
          </time>
          {paper.download_count > 0 ? (
            <span>· {paper.download_count} downloads</span>
          ) : null}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {paper.title}
        </h1>
        {paper.topics.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {paper.topics.map((topic) => (
              <Badge key={topic} variant="outline" className="font-mono text-[11px]">
                {topic}
              </Badge>
            ))}
          </div>
        ) : null}
      </header>

      <div className="mt-8 rounded-lg border bg-card/40 p-5">
        <p className="font-mono text-xs tracking-widest text-brand uppercase">
          Abstract
        </p>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          {paper.abstract}
        </p>
        <div className="mt-5 flex items-center gap-3">
          <Button asChild>
            <a href={`/api/download/${paper.slug}`}>
              <Download className="size-4" /> Download PDF
            </a>
          </Button>
          {paper.pdf_size_bytes ? (
            <span className="font-mono text-xs text-muted-foreground">
              {formatBytes(paper.pdf_size_bytes)}
            </span>
          ) : null}
        </div>
      </div>

      {paper.content ? (
        <div className="mt-10 border-t border-border/60 pt-10">
          <Mdx source={paper.content} />
        </div>
      ) : null}

      {posts.length > 0 ? (
        <aside className="mt-12 border-t border-border/60 pt-8">
          <p className="font-mono text-xs tracking-widest text-brand uppercase">
            Discussed in
          </p>
          <div className="mt-4 space-y-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group block rounded-lg border bg-card/40 p-4 transition-colors duration-200 hover:border-border hover:bg-card"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-medium tracking-tight transition-colors duration-150 group-hover:text-brand">
                    {post.title}
                  </h3>
                  <time
                    dateTime={post.published_at ?? undefined}
                    className="shrink-0 font-mono text-xs text-muted-foreground"
                  >
                    {formatDate(post.published_at)}
                  </time>
                </div>
                {post.excerpt ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {post.excerpt}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </aside>
      ) : null}
    </article>
  );
}
