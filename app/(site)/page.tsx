import Link from "next/link";
import { ArrowRight, FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PostLog } from "@/components/site/post-log";
import { OuPath } from "@/components/site/ou-path";
import { ProjectCard } from "@/components/site/project-card";
import { ResearchCard } from "@/components/site/research-card";
import { SectionHeading } from "@/components/site/section-heading";
import { TypedText } from "@/components/site/typed-text";
import {
  GitHubIcon,
  LinkedInIcon,
  XIcon,
} from "@/components/site/social-icons";
import { getFeaturedProjects } from "@/lib/data/projects";
import { getPublishedPosts } from "@/lib/data/posts";
import { getPublishedPapers } from "@/lib/data/research";
import { getProfileSettings, getSocialLinks } from "@/lib/data/settings";
import { getTagIconMap } from "@/lib/data/tag-kinds";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const [profile, socialLinks, projects, posts, papers, tagIcons] =
    await Promise.all([
      getProfileSettings(),
      getSocialLinks(),
      getFeaturedProjects(3),
      getPublishedPosts(),
      getPublishedPapers(),
      getTagIconMap(),
    ]);

  const github = socialLinks.find((l) => l.icon === "github");
  const linkedin = socialLinks.find((l) => l.icon === "linkedin");
  const x = socialLinks.find((l) => l.icon === "x" || l.icon === "twitter");

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="relative mx-auto w-full max-w-5xl px-6 py-24 sm:py-32">
          <div className="relative z-10 lg:max-w-xl">
            <p className="font-mono text-sm text-brand">
              <TypedText text="~/glyn.dev" caret="blink" delayMs={250} />
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              {profile.headline || `${profile.name}.`}
            </h1>
            {profile.bio ? (
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
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
                  {/* `/api/resume` logs the click, then redirects to the PDF.
                    Keep `referrerPolicy` default so the route can record
                    which page the download started from. */}
                  <a href="/api/resume" target="_blank" rel="noopener">
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
          {/* Beside the copy from lg, faded in from the left so it never sits
              under the text; below the copy on narrower screens, where there
              is no room beside it. */}
          <OuPath className="mt-12 lg:absolute lg:inset-y-24 lg:right-6 lg:left-[56%] lg:mt-0 lg:[mask-image:linear-gradient(to_right,transparent,#000_35%,#000_94%,transparent)]" />
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
          {/* Three columns only when there are three cards to fill them: two
              featured projects in a three-column grid leave a hole on the
              right that reads as a missing card. */}
          <div
            className={cn(
              "mt-8 grid gap-4 sm:grid-cols-2",
              projects.length >= 3 && "lg:grid-cols-3",
            )}
          >
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                tagIcons={tagIcons}
              />
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
            <PostLog posts={posts.slice(0, 3)} className="mt-8" />
          </div>
        </section>
      ) : null}

      {/* Recent research */}
      {papers.length > 0 ? (
        <section className="border-t border-border/60">
          <div className="mx-auto w-full max-w-5xl px-6 py-20">
            <SectionHeading
              label="Research"
              title="Recent research"
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
