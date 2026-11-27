import "katex/dist/katex.min.css";

import type { Metadata } from "next";
import { FileDown, Mail, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  GitHubIcon,
  LinkedInIcon,
  XIcon,
} from "@/components/site/social-icons";
import { getProfileSettings, getSocialLinks } from "@/lib/data/settings";
import { profileFacts } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { Mdx } from "@/lib/mdx";

export const metadata: Metadata = {
  title: "About",
  description: "About Glyn Finck. Background, experience, and contact.",
};

const BRAND_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  github: GitHubIcon,
  linkedin: LinkedInIcon,
  x: XIcon,
  twitter: XIcon,
  mail: Mail,
};

export default async function AboutPage() {
  const [profile, socialLinks] = await Promise.all([
    getProfileSettings(),
    getSocialLinks(),
  ]);

  const facts = profileFacts(profile);
  const hasSummary = facts.length > 0 || profile.timeline.length > 0;

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          {profile.name}
        </h1>
        <p className="mt-1 text-lg text-muted-foreground">{profile.headline}</p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {profile.location ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" /> {profile.location}
            </span>
          ) : null}
          {profile.email ? (
            <a
              href={`mailto:${profile.email}`}
              className="flex items-center gap-1.5 transition-colors duration-150 hover:text-foreground"
            >
              <Mail className="size-3.5" /> {profile.email}
            </a>
          ) : null}
        </div>
      </header>

      {/* The page spans the navbar's width like every other index. On a
          laptop the story keeps a reading measure on the left and the facts
          and path sit in a rail on the right; on narrower screens the facts
          come first, then the story. */}
      <div className="mt-8 border-t border-border/60 pt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-x-14">
        {/* The facts someone can read in five seconds, then the path, then the
          story for anyone who wants it. The prose still carries all of it;
          this is the summary, not a replacement. */}
        {hasSummary ? (
          <aside
            aria-label="Summary"
            className="grid gap-8 sm:grid-cols-2 sm:gap-10 lg:col-start-2 lg:row-start-1 lg:grid-cols-1 lg:content-start"
          >
            {facts.length > 0 ? (
              <div className="font-mono text-sm">
                <p>
                  <span aria-hidden className="text-brand select-none">
                    ${" "}
                  </span>
                  whoami
                </p>
                <dl className="mt-3 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5">
                  {facts.map((fact) => (
                    <div key={fact.key} className="contents">
                      <dt className="text-muted-foreground">{fact.key}</dt>
                      <dd className="break-words">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
            {profile.timeline.length > 0 ? (
              <ol className="space-y-4 border-l border-border pl-5">
                {profile.timeline.map((entry, i) => (
                  <li key={`${entry.when}-${i}`} className="relative text-sm">
                    {/* The dot sits on the rule; the newest one is lit. */}
                    <span
                      aria-hidden
                      className={
                        i === 0
                          ? "absolute top-[0.45rem] -left-[calc(1.25rem+3.5px)] size-[7px] rounded-full bg-brand ring-3 ring-brand/25"
                          : "absolute top-[0.45rem] -left-[calc(1.25rem+3.5px)] size-[7px] rounded-full bg-muted-foreground"
                      }
                    />
                    <p className="font-mono text-xs text-muted-foreground">
                      {entry.when}
                    </p>
                    <p className="mt-0.5 leading-relaxed">{entry.text}</p>
                  </li>
                ))}
              </ol>
            ) : null}
          </aside>
        ) : null}

        <div
          className={cn(
            "max-w-3xl lg:col-start-1 lg:row-start-1",
            hasSummary &&
              "mt-8 border-t border-border/60 pt-8 lg:mt-0 lg:border-t-0 lg:pt-0",
          )}
        >
          {profile.about ? (
            <Mdx source={profile.about} />
          ) : profile.bio ? (
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              {profile.bio.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {profile.resume_url ? (
              <Button asChild>
                {/* Tracked redirect — see `/api/resume`. */}
                <a href="/api/resume" target="_blank" rel="noopener">
                  <FileDown className="size-4" /> Download resume
                </a>
              </Button>
            ) : null}
            {socialLinks.map((link) => {
              const Icon = BRAND_ICONS[link.icon ?? ""];
              return (
                <Button key={link.url} asChild variant="outline" size="sm">
                  <a
                    href={link.url}
                    target={
                      link.url.startsWith("mailto:") ? undefined : "_blank"
                    }
                    rel="noreferrer"
                  >
                    {Icon ? <Icon className="size-3.5" /> : null}
                    {link.label}
                  </a>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
