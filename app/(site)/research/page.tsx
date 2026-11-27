import type { Metadata } from "next";
import { Suspense } from "react";

import { CardGridSkeleton } from "@/components/site/loading-shell";
import { ResearchCard } from "@/components/site/research-card";
import { getPublishedPapers } from "@/lib/data/research";

export const metadata: Metadata = {
  title: "Research",
  description:
    "Research write-ups and empirical studies. Every paper is a free PDF.",
};

export default function ResearchPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Research</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Write-ups and empirical studies. Every paper is a free PDF, no sign-up
        required.
      </p>
      {/* Inline rather than a loading.tsx, which would sit above [slug] and
          turn its notFound() into a soft 404. */}
      <Suspense fallback={<CardGridSkeleton command="ls research/" />}>
        <PaperGrid />
      </Suspense>
    </section>
  );
}

async function PaperGrid() {
  const papers = await getPublishedPapers();

  return (
    <>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {papers.map((paper) => (
          <ResearchCard key={paper.id} paper={paper} />
        ))}
      </div>
      {papers.length === 0 ? (
        <p className="mt-10 text-muted-foreground">No papers yet.</p>
      ) : null}
    </>
  );
}
