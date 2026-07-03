import type { Metadata } from "next";

import { ResearchCard } from "@/components/site/research-card";
import { TypedTextInView } from "@/components/site/typed-text-in-view";
import { getPublishedPapers } from "@/lib/data/research";

export const metadata: Metadata = {
  title: "Research",
  description:
    "Quantitative research write-ups — signals, backtests, and market structure. PDFs freely available.",
};

export default async function ResearchPage() {
  const papers = await getPublishedPapers();

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      <p className="font-mono text-xs tracking-widest text-brand uppercase">
        <TypedTextInView text="Research" />
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Quant research
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Strategy write-ups and empirical studies. Every paper is a free PDF —
        no sign-up required.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {papers.map((paper) => (
          <ResearchCard key={paper.id} paper={paper} />
        ))}
      </div>
      {papers.length === 0 ? (
        <p className="mt-10 text-muted-foreground">No papers yet.</p>
      ) : null}
    </section>
  );
}
