/**
 * The mark that closes an article body, so the prose ends on purpose instead
 * of running straight into "Referenced research" or the comments.
 *
 * Short rules, not full-width ones: the section after an article opens with
 * its own full-width border, and two dividers in a row read as a gap.
 */
export function ArticleEnd() {
  return (
    <p
      aria-hidden
      className="mt-12 flex items-center gap-3 font-mono text-xs text-muted-foreground select-none justify-center before:h-px before:w-10 before:bg-border after:h-px after:w-10 after:bg-border print:hidden"
    >
      EOF
    </p>
  );
}
