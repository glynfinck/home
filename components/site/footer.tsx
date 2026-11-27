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
      {/* One line on a laptop. Below that the line cannot fit, so instead of
          letting it wrap wherever it breaks, it becomes three set rows with a
          straight left edge and a straight right edge:

            glyn.dev main a839bd4        London 11:10
            deployed 1h ago         © 2026 Glyn Finck
            rss github linkedin email

          Grid placement is explicit, so a missing piece (no commit in dev, no
          time zone) leaves a gap instead of shuffling the others. */}
      <div className="mx-auto grid w-full max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:flex lg:gap-y-0 lg:py-3">
        <span className="col-start-1 row-start-1 flex min-w-0 items-center gap-x-3 lg:contents">
          <span className="shrink-0 rounded-sm bg-brand px-1.5 py-0.5 font-medium text-background">
            glyn.dev
          </span>
          {sha ? (
            <span className="flex min-w-0 gap-[1ch]">
              {/* A preview branch name can be long; the commit is what matters. */}
              {ref ? (
                <span className="max-w-[10ch] truncate text-foreground sm:max-w-[16ch]">
                  {ref}
                </span>
              ) : null}
              {sha}
            </span>
          ) : null}
        </span>
        {builtAt ? (
          <span className="col-start-1 row-start-2">
            deployed <DeployAge iso={builtAt} fallback={formatDate(builtAt)} />
          </span>
        ) : null}
        <span className="col-start-2 row-start-2 justify-self-end">
          © {new Date().getFullYear()} {name}
        </span>

        {/* Pushes the second group to the right edge on the one-line layout. */}
        <span aria-hidden className="hidden flex-1 lg:block" />

        {timezone ? (
          <span className="col-start-2 row-start-1 justify-self-end">
            {city ? `${city} ` : null}
            <LocalClock timeZone={timezone} />
          </span>
        ) : null}
        <nav
          aria-label="Elsewhere"
          className="col-span-2 row-start-3 flex flex-wrap gap-x-4 gap-y-2 lg:gap-x-3"
        >
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
