import Link from "next/link";
import { ArrowRight, FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PostRow } from "@/components/site/post-card";
import { ProjectCard } from "@/components/site/project-card";
import { ResearchCard } from "@/components/site/research-card";
import { SectionHeading } from "@/components/site/section-heading";
import {
  GitHubIcon,
  LinkedInIcon,
  XIcon,
} from "@/components/site/social-icons";
import { getFeaturedProjects } from "@/lib/data/projects";
import { getPublishedPosts } from "@/lib/data/posts";
import { getPublishedPapers } from "@/lib/data/research";
import { getProfileSettings, getSocialLinks } from "@/lib/data/settings";

export default async function HomePage() {
  const [profile, socialLinks, projects, posts, papers] = await Promise.all([
    getProfileSettings(),
    getSocialLinks(),
    getFeaturedProjects(3),
    getPublishedPosts(),
    getPublishedPapers(),
  ]);

  const github = socialLinks.find((l) => l.icon === "github");
  const linkedin = socialLinks.find((l) => l.icon === "linkedin");
  const x = socialLinks.find((l) => l.icon === "x" || l.icon === "twitter");

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(color-mix(in_oklch,var(--border)_80%,transparent)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black_10%,transparent_70%)]"
        />
        <div className="relative mx-auto w-full max-w-5xl px-6 py-24 sm:py-32">
          <p className="font-mono text-sm text-brand">~/glyn.dev</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {profile.headline || `${profile.name}.`}
          </h1>
          {profile.bio ? (
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {profile.bio}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/projects">
                View projects <ArrowRight className="size-4" />
              </Link>
            </Button>
            {profile.resume_url ? (
              <Button asChild variant="outline">
                <a href={profile.resume_url} target="_blank" rel="noreferrer">
                  <FileDown className="size-4" /> Resume
                </a>
              </Button>
            ) : null}
            <div className="ml-1 flex items-center gap-1">
              {github ? (
                <SocialIconLink href={github.url} label="GitHub">
                  <GitHubIcon className="size-4" />
                </SocialIconLink>
              ) : null}
              {linkedin ? (
                <SocialIconLink href={linkedin.url} label="LinkedIn">
                  <LinkedInIcon className="size-4" />
                </SocialIconLink>
              ) : null}
              {x ? (
                <SocialIconLink href={x.url} label="X">
                  <XIcon className="size-4" />
                </SocialIconLink>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Featured projects */}
      {projects.length > 0 ? (
        <section className="mx-auto w-full max-w-5xl px-6 py-20">
          <SectionHeading
            label="Projects"
            title="Selected work"
            href="/projects"
            hrefLabel="All projects"
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Latest writing */}
      {posts.length > 0 ? (
        <section className="border-t border-border/60">
          <div className="mx-auto w-full max-w-5xl px-6 py-20">
            <SectionHeading
              label="Blog"
              title="Latest writing"
              href="/blog"
              hrefLabel="All posts"
            />
            <div className="mt-4 divide-y divide-border/60">
              {posts.slice(0, 3).map((post) => (
                <PostRow key={post.id} post={post} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Recent research */}
      {papers.length > 0 ? (
        <section className="border-t border-border/60">
          <div className="mx-auto w-full max-w-5xl px-6 py-20">
            <SectionHeading
              label="Research"
              title="Quant research"
              href="/research"
              hrefLabel="All papers"
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {papers.slice(0, 2).map((paper) => (
                <ResearchCard key={paper.id} paper={paper} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

function SocialIconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="rounded-md p-2 text-muted-foreground transition-colors duration-150 hover:text-foreground"
    >
      {children}
    </a>
  );
}
