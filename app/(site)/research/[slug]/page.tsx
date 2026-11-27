import "katex/dist/katex.min.css";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";

import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { ArticleEnd } from "@/components/site/article-end";
import { Chip } from "@/components/site/chip";
import { CopyCitation } from "@/components/site/copy-citation";
import { Highlights } from "@/components/site/highlights";
import { ArticleBodySkeleton } from "@/components/site/loading-shell";
import { ReadingProgress } from "@/components/site/reading-progress";
import { Toc } from "@/components/site/toc";
import {
  getPaperBySlug,
  getPostsForPaper,
  getPublishedPapers,
} from "@/lib/data/research";
import { bibtex } from "@/lib/citation";
import { getProfileSettings, getSeoSettings } from "@/lib/data/settings";
import { formatBytes, formatDate } from "@/lib/format";
import { parseHighlights } from "@/lib/highlights";
import { Mdx } from "@/lib/mdx";
import { extractToc } from "@/lib/toc";

type Props = { params: Promise<{ slug: string }> };

/** Prerendered at build so the link is fully prefetched. See the blog route. */
export async function generateStaticParams() {
  const papers = await getPublishedPapers();
  return papers.map((paper) => ({ slug: paper.slug }));
}

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

  const [posts, profile, seo] = await Promise.all([
    getPostsForPaper(paper.id),
    getProfileSettings(),
    getSeoSettings(),
  ]);
  const toc = paper.content ? extractToc(paper.content) : [];
  const highlights = parseHighlights(paper.highlights);
  const citation = bibtex({
    author: profile.name,
    title: paper.title,
    slug: paper.slug,
    publishedAt: paper.published_at,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? seo.url,
  });

  return (
    <>
      <ReadingProgress />
      {/* Same three-column article grid as a blog post: TOC rail, prose, and
          the gutter `.sidenote` floats into. */}
      <div className="mx-auto w-full max-w-3xl px-6 py-16 xl:max-w-[74rem]">
        <div className="xl:grid xl:grid-cols-[12rem_minmax(0,44rem)_14rem] xl:gap-x-8">
          <div className="hidden xl:block">
            <Toc entries={toc} variant="rail" />
          </div>
          <article className="min-w-0">
            <header>
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-muted-foreground">
                <time dateTime={paper.published_at ?? undefined}>
                  {formatDate(paper.published_at)}
                </time>
                {paper.download_count > 0 ? (
                  <span>· {paper.download_count} downloads</span>
                ) : null}
              </div>
              <h1
                className="article-title mt-3"
                data-long={paper.title.length > 64 || undefined}
              >
                {paper.title}
              </h1>
              {paper.topics.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {paper.topics.map((topic) => (
                    <Chip key={topic}>{topic}</Chip>
                  ))}
                </div>
              ) : null}
            </header>

            {/* The result first: what the paper found, in numbers, before
                the prose that explains it. */}
            <Highlights items={highlights} size="page" className="mt-8" />

            <div className="mt-6 rounded-lg border bg-card/40 p-5">
              <p className="font-mono text-xs tracking-widest text-brand uppercase">
                Abstract
              </p>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                {paper.abstract}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button asChild>
                  <a href={`/api/download/${paper.slug}`}>
                    <Download className="size-4" /> Download PDF
                  </a>
                </Button>
                <CopyCitation citation={citation} />
                {paper.pdf_size_bytes ? (
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatBytes(paper.pdf_size_bytes)}
                  </span>
                ) : null}
              </div>
              <details className="group mt-4">
                <summary className="cursor-pointer list-none font-mono text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Show BibTeX</span>
                  <span className="hidden group-open:inline">Hide BibTeX</span>
                </summary>
                <pre className="mt-3 overflow-x-auto rounded-md border border-border/60 bg-background p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                  {citation}
                </pre>
              </details>
            </div>

            {paper.content ? (
              <div className="mt-10 border-t border-border/60 pt-10">
                <div className="xl:hidden">
                  <Toc entries={toc} variant="inline" />
                </div>
                {/* The abstract and download button above are the point of the
                    page and resolve from one cached row; the body has to
                    compile MDX and render any figures in it. */}
                <Suspense fallback={<ArticleBodySkeleton />}>
                  <Mdx source={paper.content} />
                  <ArticleEnd />
                </Suspense>
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
        </div>
      </div>
    </>
  );
}
