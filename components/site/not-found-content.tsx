import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TypedText } from "@/components/site/typed-text";

/**
 * The 404 body, shared by both not-found files.
 *
 * `app/(site)/not-found.tsx` handles `notFound()` thrown inside the site tree
 * and inherits that layout's navbar and footer. `app/not-found.tsx` handles
 * URLs that match no route at all, which sit outside the `(site)` group, so it
 * supplies the same chrome itself. One body keeps the two from drifting.
 */
export function NotFoundContent() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-start px-6 py-32">
      <p className="font-mono text-sm text-brand">
        <TypedText text="404: no such file or directory" speedMs={45} />
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="mt-3 text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Button asChild variant="outline" className="mt-8">
        <Link href="/">cd ~/</Link>
      </Button>
    </section>
  );
}
