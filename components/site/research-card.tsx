import Link from "next/link";
import { Download, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import type { ResearchPaper } from "@/lib/data/research";

export function ResearchCard({ paper }: { paper: ResearchPaper }) {
  return (
    <article className="group rounded-lg border border-border/60 bg-card/40 p-6 transition-colors duration-200 hover:border-border hover:bg-card">
      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <FileText className="size-3.5 text-brand" />
        <time dateTime={paper.published_at ?? undefined}>
          {formatDate(paper.published_at)}
        </time>
        {paper.download_count > 0 ? (
          <span>· {paper.download_count} downloads</span>
        ) : null}
      </div>
      <Link href={`/research/${paper.slug}`}>
        <h3 className="mt-3 font-medium tracking-tight transition-colors duration-150 group-hover:text-brand">
          {paper.title}
        </h3>
      </Link>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {paper.abstract}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {paper.topics.map((topic) => (
            <Badge key={topic} variant="outline" className="font-mono text-[11px]">
              {topic}
            </Badge>
          ))}
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/download/${paper.slug}`}>
            <Download className="size-3.5" /> PDF
          </a>
        </Button>
      </div>
    </article>
  );
}
