import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { GitHubIcon } from "@/components/site/social-icons";
import type { Project } from "@/lib/data/projects";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="group relative flex flex-col rounded-lg border border-border/60 bg-card/40 p-6 transition-colors duration-200 hover:border-border hover:bg-card">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium tracking-tight">{project.title}</h3>
        <div className="flex items-center gap-2">
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
          <Badge key={tech} variant="outline" className="font-mono text-[11px]">
            {tech}
          </Badge>
        ))}
      </div>
    </article>
  );
}
