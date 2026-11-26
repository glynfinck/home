import Link from "next/link";
import { Download, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkPending } from "@/components/site/route-progress";
import { formatDate } from "@/lib/format";
import type { ResearchPaper } from "@/lib/data/research";

export function ResearchCard({ paper }: { paper: ResearchPaper }) {
  return (
    <article className="group relative flex flex-col rounded-lg border border-border/60 bg-card/40 p-6 transition-colors duration-200 hover:border-border hover:bg-card">
      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <FileText className="size-3.5 text-brand" />
        <time dateTime={paper.published_at ?? undefined}>
          {formatDate(paper.published_at)}
        </time>
        {paper.download_count > 0 ? (
          <span>· {paper.download_count} downloads</span>
        ) : null}
      </div>
      {/* Stretched over the card so the hover state and the click target are
          the same shape; the PDF button sits above it. */}
      <Link
        href={`/research/${paper.slug}`}
        className="outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
      >
        <h3 className="mt-3 font-medium tracking-tight transition-colors duration-150 group-hover:text-brand">
          {paper.title}
        </h3>
        <LinkPending />
      </Link>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {paper.abstract}
      </p>
      {/* `mt-auto` pins the footer to the bottom of the card, and no wrapping
          between the two halves keeps the PDF button bottom-right however
          many topics there are. It used to drop under the topics whenever
          they ran to a second line. */}
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {paper.topics.map((topic) => (
            <Badge key={topic} variant="outline" className="font-mono text-[11px]">
              {topic}
            </Badge>
          ))}
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="relative z-10 shrink-0"
        >
          <a href={`/api/download/${paper.slug}`}>
            <Download className="size-3.5" /> PDF
          </a>
        </Button>
      </div>
    </article>
  );
}
