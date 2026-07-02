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
import { Mdx } from "@/lib/mdx";

export const metadata: Metadata = {
  title: "About",
  description: "About Glyn Finck. Background, experience, and contact.",
};

const BRAND_ICONS: Record<string, React.ComponentType<{ className?: string }>> =
  {
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

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <p className="font-mono text-xs tracking-widest text-brand uppercase">
        About
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
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

      {profile.about ? (
        <div className="mt-8 border-t border-border/60 pt-8">
          <Mdx source={profile.about} />
        </div>
      ) : profile.bio ? (
        <div className="mt-8 space-y-4 border-t border-border/60 pt-8 leading-relaxed text-muted-foreground">
          {profile.bio.split("\n\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {profile.resume_url ? (
          <Button asChild>
            <a href={profile.resume_url} target="_blank" rel="noreferrer">
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
                target={link.url.startsWith("mailto:") ? undefined : "_blank"}
                rel="noreferrer"
              >
                {Icon ? <Icon className="size-3.5" /> : null}
                {link.label}
              </a>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
