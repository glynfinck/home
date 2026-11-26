import { DeployAge, LocalClock } from "@/components/site/status-clock";
import { formatDate } from "@/lib/format";

export type SocialLink = {
  label: string;
  url: string;
  icon?: string;
};

/**
 * The footer as an editor status line: what the site is running, how fresh it
 * is, and what time it is where its owner is.
 *
 * The commit and build time come from `next.config.ts`, which resolves them
 * once per build, so nothing here needs maintaining.
 */
export function Footer({
  name = "Glyn Finck",
  socialLinks = [],
  location = "",
  timezone = "",
}: {
  name?: string;
  socialLinks?: SocialLink[];
  /** "London, England": the first part labels the clock. */
  location?: string;
  /** IANA zone for the clock. Without it the clock is left out. */
  timezone?: string;
}) {
  const sha = process.env.BUILD_SHA;
  const ref = process.env.BUILD_REF;
  const builtAt = process.env.BUILD_TIME;
  const city = location.split(",")[0].trim();

  return (
    <footer className="border-t border-border/60 bg-card/40 font-mono text-xs text-muted-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
        <span className="rounded-sm bg-brand px-1.5 py-0.5 font-medium text-background">
          glyn.dev
        </span>
        {sha ? (
          <span className="flex min-w-0 gap-[1ch]">
            {/* A preview branch name can be long; the commit is what matters. */}
            {ref ? (
              <span className="max-w-[16ch] truncate text-foreground">
                {ref}
              </span>
            ) : null}
            {sha}
          </span>
        ) : null}
        {builtAt ? (
          <span>
            deployed <DeployAge iso={builtAt} fallback={formatDate(builtAt)} />
          </span>
        ) : null}
        <span>
          © {new Date().getFullYear()} {name}
        </span>

        {/* Pushes the second group to the right edge on one line, and to its
            own line when the row wraps. */}
        <span aria-hidden className="hidden flex-1 sm:block" />

        {timezone ? (
          <span>
            {city ? `${city} ` : null}
            <LocalClock timeZone={timezone} />
          </span>
        ) : null}
        <nav aria-label="Elsewhere" className="flex flex-wrap gap-x-3 gap-y-2">
          <FooterLink href="/rss.xml">rss</FooterLink>
          {socialLinks.map((link) => (
            <FooterLink key={link.url} href={link.url}>
              {link.label.toLowerCase()}
            </FooterLink>
          ))}
        </nav>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const external = /^https?:/.test(href);
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="transition-colors duration-150 hover:text-foreground"
    >
      {children}
    </a>
  );
}
