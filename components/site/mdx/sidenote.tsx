import { cn } from "@/lib/utils";

/**
 * Tufte-style margin note: `<Sidenote>a caveat</Sidenote>`.
 *
 * At `xl` the note sits in the right margin, always visible. Below that it
 * collapses behind its superscript number, which the reader taps to expand.
 *
 * Numbering is a CSS counter (see `globals.css`), so authors never hand-number
 * and inserting a note mid-article renumbers everything after it for free.
 *
 * No JavaScript, and no generated ids: the checkbox is nested inside its label
 * so the association is implicit, and `:has()` carries the checked state to the
 * sibling note. That keeps this a server component (`useId` is client-only)
 * while still working with JS disabled.
 *
 * Children must be *inline* content. The note renders inside the surrounding
 * paragraph, so a block element here produces invalid HTML.
 */
export function Sidenote({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <label className="sidenote-ref">
        <input type="checkbox" aria-label="Show note" />
      </label>
      <span className={cn("sidenote", className)}>{children}</span>
    </>
  );
}
