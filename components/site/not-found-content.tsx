"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Caret } from "@/components/site/caret";
import { NAV_ITEMS, nearestSection } from "@/lib/nav";

/** Long enough for any real slug, short enough that a pasted blob of junk
 *  does not push the listing off the screen. */
const MAX_ECHO = 96;

/**
 * The 404 body, shared by both not-found files.
 *
 * `app/(site)/not-found.tsx` handles `notFound()` thrown inside the site tree
 * and inherits that layout's navbar and footer. `app/not-found.tsx` handles
 * URLs that match no route at all, which sit outside the `(site)` group, so it
 * supplies the same chrome itself. One body keeps the two from drifting.
 *
 * It answers in the shell's own words: the path that was asked for, the error,
 * and then what is actually here, with the nearest real section called out
 * when the path looks like a typo of one.
 */
export function NotFoundContent() {
  const pathname = usePathname();
  const echoed =
    pathname.length > MAX_ECHO ? `${pathname.slice(0, MAX_ECHO)}…` : pathname;
  const suggestion = nearestSection(pathname);

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-24 sm:py-32">
      <h1 className="sr-only">Page not found</h1>
      <div className="font-mono text-sm leading-loose">
        <p className="break-all">
          <Prompt /> cd {echoed}
        </p>
        <p className="break-all text-series-2">
          cd: no such file or directory: {echoed}
        </p>
        <p className="mt-4">
          <Prompt /> ls ~/
        </p>
        <ul className="flex flex-wrap gap-x-6">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-brand underline-offset-4 hover:underline"
              >
                {item.href.slice(1)}/
              </Link>
            </li>
          ))}
        </ul>
        {suggestion ? (
          <p className="mt-4 text-muted-foreground">
            did you mean{" "}
            <Link
              href={suggestion.href}
              className="text-brand underline-offset-4 hover:underline"
            >
              {suggestion.href}
            </Link>{" "}
            ?
          </p>
        ) : null}
        <p className="mt-4">
          <Prompt />{" "}
          <Link href="/" className="underline-offset-4 hover:underline">
            cd ~/
          </Link>
          <Caret />
        </p>
      </div>
    </section>
  );
}

function Prompt() {
  return (
    <span aria-hidden className="text-brand select-none">
      $
    </span>
  );
}
