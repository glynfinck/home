import type { Metadata } from "next";

import { ProjectCard } from "@/components/site/project-card";
import { TypedTextInView } from "@/components/site/typed-text-in-view";
import { getPublishedProjects } from "@/lib/data/projects";

export const metadata: Metadata = {
  title: "Projects",
  description: "Selected projects and open-source work.",
};

export default async function ProjectsPage() {
  const projects = await getPublishedProjects();

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
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
      {projects.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Nothing here yet.</p>
      ) : null}
    </section>
  );
}
