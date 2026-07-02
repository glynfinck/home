"use client";

import * as React from "react";

import { TypedText } from "@/components/site/typed-text";

type TypedTextInViewProps = Omit<
  React.ComponentProps<typeof TypedText>,
  "run" | "ref"
> & {
  /** Negative bottom inset so typing starts once the label is comfortably in view. */
  rootMargin?: string;
};

/**
 * Types once when scrolled into view. Renders the full static text until
 * triggered, so crawlers, no-JS visitors, and reduced-motion users always
 * see the label immediately.
 */
export function TypedTextInView({
  rootMargin = "0px 0px -64px 0px",
  caret = "hide",
  ...props
}: TypedTextInViewProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [run, setRun] = React.useState(false);

  React.useEffect(() => {
    if (run) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRun(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [run, rootMargin]);

  return <TypedText ref={ref} run={run} caret={caret} {...props} />;
}
