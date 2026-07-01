import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPaperBySlug } from "@/lib/data/research";

/**
 * Inline research-paper embed for MDX bodies:
 *   <PaperCard slug="momentum-decay-crypto" />
 */
export async function PaperCard({ slug }: { slug: string }) {
  const paper = await getPaperBySlug(slug);
  if (!paper) return null;

  return (
    <aside className="not-prose my-8 rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-mono text-xs tracking-wide text-brand uppercase">
            <FileText className="size-3.5" /> Research
          </p>
          <Link
            href={`/research/${paper.slug}`}
            className="mt-2 block font-medium tracking-tight transition-colors duration-150 hover:text-brand"
          >
            {paper.title}
          </Link>
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
            {paper.abstract}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <a href={`/api/download/${paper.slug}`}>
            PDF <ArrowUpRight className="size-3.5" />
          </a>
        </Button>
      </div>
    </aside>
  );
}
