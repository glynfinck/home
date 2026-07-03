import * as React from "react";

import { cn } from "@/lib/utils";

type TypedTextProps = {
  text: string;
  /** When false, renders the full text statically (pre-trigger state for TypedTextInView). */
  run?: boolean;
  /** "blink" keeps the caret after typing; "hide" drops it ~700ms after; "none" never shows one. */
  caret?: "blink" | "hide" | "none";
  /** Per-character typing speed. */
  speedMs?: number;
  /** Delay before typing starts. */
  delayMs?: number;
  className?: string;
  ref?: React.Ref<HTMLSpanElement>;
};

/**
 * CSS-only typewriter (see the terminal typing section in globals.css).
 * Assumes a monospace (font-mono) context: the steps() reveal lands on
 * character boundaries only when every glyph has the same advance.
 */
export function TypedText({
  text,
  run = true,
  caret = "blink",
  speedMs = 70,
  delayMs = 150,
  className,
  ref,
}: TypedTextProps) {
  return (
    <span
      ref={ref}
      className={cn("typed", className)}
      data-typed={run ? "run" : "static"}
      data-caret={caret}
      style={
        {
          "--typed-chars": [...text].length,
          "--typed-speed": `${speedMs}ms`,
          "--typed-delay": `${delayMs}ms`,
        } as React.CSSProperties
      }
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden className="typed-sizer">
        {text}
      </span>
      <span aria-hidden className="typed-text">
        {text}
      </span>
    </span>
  );
}
