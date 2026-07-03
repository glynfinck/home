import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TypedText } from "@/components/site/typed-text";

export default function RootNotFound() {
  return (
    <main className="flex flex-1 items-center">
      <section className="mx-auto w-full max-w-5xl px-6 py-32">
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
    </main>
  );
}
