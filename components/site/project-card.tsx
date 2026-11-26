import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { GitHubIcon } from "@/components/site/social-icons";
import { LinkPending } from "@/components/site/route-progress";
import { StackBadge } from "@/components/site/stack-badge";
import type { Project } from "@/lib/data/projects";

export function ProjectCard({
  project,
  tagIcons,
}: {
  project: Project;
  tagIcons?: Record<string, string>;
}) {
  return (
    <article className="group relative flex flex-col rounded-lg border border-border/60 bg-card/40 p-6 transition-colors duration-200 hover:border-border hover:bg-card">
      <div className="flex items-start justify-between gap-3">
        {/* The whole card lights up on hover, so the whole card has to be the
            link: `after:inset-0` stretches the title's hit area over it. The
            GitHub and live links sit above that layer (`relative z-10`). */}
        <Link
          href={`/projects/${project.slug}`}
          className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          <h3 className="font-medium tracking-tight transition-colors duration-150 group-hover:text-brand">
            {project.title}
          </h3>
          <LinkPending />
        </Link>
        <div className="relative z-10 flex items-center gap-2">
          {project.github_url ? (
            <a
              href={project.github_url}
              target="_blank"
              rel="noreferrer"
              aria-label={`${project.title} on GitHub`}
              className="text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              <GitHubIcon className="size-4" />
            </a>
          ) : null}
          {project.live_url ? (
            <a
              href={project.live_url}
              target="_blank"
              rel="noreferrer"
              aria-label={`${project.title} live site`}
              className="text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              <ArrowUpRight className="size-4" />
            </a>
          ) : null}
        </div>
      </div>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {project.summary}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {project.tech_stack.map((tech) => (
          <StackBadge key={tech} tag={tech} tagIcons={tagIcons} />
        ))}
      </div>
    </article>
  );
}
