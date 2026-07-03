import type { Metadata } from "next";
import { Suspense } from "react";

import { ProjectCard } from "@/components/site/project-card";
import { TerminalLoader } from "@/components/site/terminal-loader";
import { TypedTextInView } from "@/components/site/typed-text-in-view";
import { getPublishedProjects } from "@/lib/data/projects";
import { getTagIconMap } from "@/lib/data/tag-kinds";

export const metadata: Metadata = {
  title: "Projects",
  description: "Selected projects and open-source work.",
};

export default function ProjectsPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      <p className="font-mono text-xs tracking-widest text-brand uppercase">
        <TypedTextInView text="Projects" />
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Selected work
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Systems, tools, and experiments — mostly around markets and data
        infrastructure.
      </p>
      {/* Inline boundary instead of loading.tsx: a route-level loading file
          would sit above [slug] and commit HTTP 200 before its notFound() */}
      <Suspense
        fallback={
          <div className="mt-10">
            <TerminalLoader command="ls projects/" />
          </div>
        }
      >
        <ProjectGrid />
      </Suspense>
    </section>
  );
}

async function ProjectGrid() {
  const [projects, tagIcons] = await Promise.all([
    getPublishedProjects(),
    getTagIconMap(),
  ]);

  return (
    <>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} tagIcons={tagIcons} />
        ))}
      </div>
      {projects.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Nothing here yet.</p>
      ) : null}
    </>
  );
}
