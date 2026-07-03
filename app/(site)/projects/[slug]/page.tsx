import "katex/dist/katex.min.css";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { GitHubIcon } from "@/components/site/social-icons";
import { StackBadge } from "@/components/site/stack-badge";
import { getProjectBySlug } from "@/lib/data/projects";
import { getTagIconMap } from "@/lib/data/tag-kinds";
import { formatDate } from "@/lib/format";
import { Mdx } from "@/lib/mdx";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  // Thrown here (pre-stream) so the response carries a real 404 status
  if (!project) notFound();

  return {
    title: project.title,
    description: project.summary,
    openGraph: {
      title: project.title,
      description: project.summary,
      type: "article",
    },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const [project, tagIcons] = await Promise.all([
    getProjectBySlug(slug),
    getTagIconMap(),
  ]);
  if (!project) notFound();

  return (
    <article className="mx-auto w-full max-w-5xl px-6 py-16">
      <Link
        href="/projects"
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Projects
      </Link>

      <header className="mt-6">
        <p className="font-mono text-xs tracking-widest text-brand">
          ~/projects/{project.slug}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {project.title}
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {project.summary}
        </p>
      </header>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-12">
        <aside className="order-first lg:order-last lg:sticky lg:top-20">
          <div className="space-y-6 rounded-lg border border-border/60 bg-card/40 p-5">
            {project.tech_stack.length > 0 ? (
              <div>
                <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  Stack
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.tech_stack.map((tech) => (
                    <StackBadge key={tech} tag={tech} tagIcons={tagIcons} />
                  ))}
                </div>
              </div>
            ) : null}

            {project.github_url || project.live_url ? (
              <div>
                <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  Links
                </p>
                <div className="mt-3 space-y-2">
                  {project.github_url ? (
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                    >
                      <GitHubIcon className="size-4" /> GitHub
                      <ArrowUpRight className="size-3.5" />
                    </a>
                  ) : null}
                  {project.live_url ? (
                    <a
                      href={project.live_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                    >
                      <ArrowUpRight className="size-4" /> Live site
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div>
              <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                Updated
              </p>
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                {formatDate(project.updated_at)}
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          {project.content ? (
            <Mdx source={project.content} />
          ) : project.description ? (
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              {project.description.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No write-up yet. Check the links for the code and a live demo.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
