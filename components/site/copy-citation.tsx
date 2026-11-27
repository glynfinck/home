"use client";

import * as React from "react";
import { Check, Quote } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Copies a paper's BibTeX entry, and says so on the button itself. */
export function CopyCitation({ citation }: { citation: string }) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
    } catch {
      // Clipboard access denied (insecure context, or permission refused).
      // The entry is printed right above the button, so it can still be
      // selected by hand; there is nothing useful to report.
    }
  }

  return (
    <Button type="button" variant="outline" onClick={copy}>
      {copied ? <Check className="size-4" /> : <Quote className="size-4" />}
      <span aria-live="polite">{copied ? "Copied" : "Copy citation"}</span>
    </Button>
  );
}
