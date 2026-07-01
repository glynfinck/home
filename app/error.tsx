"use client";

import { Button } from "@/components/ui/button";

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 items-center">
      <section className="mx-auto w-full max-w-5xl px-6 py-32">
        <p className="font-mono text-sm text-destructive">error</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-3 text-muted-foreground">
          An unexpected error occurred. Try again — if it persists, it&apos;s on
          me, not you.
        </p>
        <Button variant="outline" className="mt-8" onClick={reset}>
          Try again
        </Button>
      </section>
    </main>
  );
}
