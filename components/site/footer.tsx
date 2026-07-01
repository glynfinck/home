import { Mail } from "lucide-react";

import {
  GitHubIcon,
  LinkedInIcon,
  XIcon,
} from "@/components/site/social-icons";

export type SocialLink = {
  label: string;
  url: string;
  icon?: string;
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  github: GitHubIcon,
  linkedin: LinkedInIcon,
  x: XIcon,
  twitter: XIcon,
  mail: Mail,
};

export function Footer({
  name = "Glyn Finck",
  socialLinks = [],
}: {
  name?: string;
  socialLinks?: SocialLink[];
}) {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} {name}
        </p>
        <div className="flex items-center gap-1">
          {socialLinks.map((link) => {
            const Icon = ICONS[link.icon ?? ""] ?? null;
            return (
              <a
                key={link.url}
                href={link.url}
                target={link.url.startsWith("mailto:") ? undefined : "_blank"}
                rel="noreferrer"
                aria-label={link.label}
                className="rounded-md p-2 text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                {Icon ? (
                  <Icon className="size-4" />
                ) : (
                  <span className="text-sm">{link.label}</span>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
