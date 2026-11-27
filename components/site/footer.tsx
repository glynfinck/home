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
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-card/40 font-mono text-xs text-muted-foreground">
      {/* One line on a laptop. Below that, two rows that each run edge to
          edge, shortened to what fits a phone:

            glyn.dev a839bd4 · 1h ago        London 11:10
            rss github linkedin email              © 2026

          The branch name, the word "deployed" and the owner's name come back
          from sm, where there is room. On the one-line layout both rows
          dissolve (`lg:contents`) and `order` puts the pieces back in status
          line order: build, copyright, spacer, clock, links. */}
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:gap-4 lg:py-3">
        <div className="flex items-center justify-between gap-4 lg:contents">
          <span className="flex min-w-0 items-center gap-x-2 whitespace-nowrap sm:gap-x-3 lg:contents">
            <span className="shrink-0 rounded-sm bg-brand px-1.5 py-0.5 font-medium text-background">
              glyn.dev
            </span>
            {sha ? (
              <span className="flex shrink-0 gap-[1ch]">
                {/* A preview branch name can be long; the commit is what matters. */}
                {ref ? (
                  <span className="hidden max-w-[16ch] truncate text-foreground sm:inline">
                    {ref}
                  </span>
                ) : null}
                {sha}
              </span>
            ) : null}
            {builtAt ? (
              <span className="min-w-0 truncate">
                <span aria-hidden className="lg:hidden">
                  ·{" "}
                </span>
                <span className="hidden sm:inline">deployed </span>
                <DeployAge iso={builtAt} fallback={formatDate(builtAt)} />
              </span>
            ) : null}
          </span>
          {timezone ? (
            <span className="shrink-0 whitespace-nowrap lg:order-4">
              {city ? `${city} ` : null}
              <LocalClock timeZone={timezone} />
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-4 lg:contents">
          <nav
            aria-label="Elsewhere"
            className="flex flex-wrap gap-x-4 gap-y-2 lg:order-5 lg:gap-x-3"
          >
            <FooterLink href="/rss.xml">rss</FooterLink>
            {socialLinks.map((link) => (
              <FooterLink key={link.url} href={link.url}>
                {link.label.toLowerCase()}
              </FooterLink>
            ))}
          </nav>
          <span className="shrink-0 whitespace-nowrap lg:order-2">
            © {year}
            <span className="hidden sm:inline"> {name}</span>
          </span>
        </div>

        {/* Pushes the clock and links to the right edge on the one-line
            layout. */}
        <span aria-hidden className="hidden flex-1 lg:order-3 lg:block" />
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
