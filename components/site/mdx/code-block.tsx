"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Copy control for a rendered code block.
 *
 * Reads the text off the DOM rather than taking it as a prop: `rehype-pretty-code`
 * has already exploded the source into per-token spans by the time it reaches
 * React, so reconstructing it from `children` would mean walking the whole
 * highlighted tree. `textContent` is exactly the original source.
 */
export function CopyButton() {
  const ref = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    const pre = ref.current
      ?.closest("[data-rehype-pretty-code-figure]")
      ?.querySelector("pre");
    const text = pre?.textContent;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard is permission-gated and unavailable over plain HTTP. Staying
      // silent is better than a toast the reader can do nothing about.
    }
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={copy}
      // Only reveal on hover/focus on pointer devices; touch has no hover, so
      // it stays visible there. `.code-copy` carries the positioning and the
      // reveal rules (globals.css) because the parent figure is emitted by
      // rehype-pretty-code and cannot take Tailwind group classes.
      className="code-copy rounded-md border border-border/60 bg-background/80 p-1.5 text-muted-foreground backdrop-blur transition-all duration-150 hover:text-foreground print:hidden"
      aria-label={copied ? "Copied" : "Copy code"}
    >
      {copied ? (
        <Check className="size-3.5 text-brand" />
      ) : (
        <Copy className="size-3.5" />
      )}
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}
