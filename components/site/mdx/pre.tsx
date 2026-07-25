import { CopyButton } from "@/components/site/mdx/code-block";

/**
 * Adds a copy button to every fenced code block.
 *
 * Returns a fragment rather than a wrapper element on purpose. `rehype-pretty-code`
 * emits `<figure><figcaption data-rehype-pretty-code-title>…</figcaption><pre>…`,
 * and globals.css joins the title to the block with an adjacent-sibling rule
 * (`[data-rehype-pretty-code-title] + pre`). Wrapping `<pre>` in a div would
 * break that selector and detach every filename tab from its block.
 *
 * The button positions itself against the figure, which globals.css makes a
 * containing block.
 */
export function Pre(props: React.ComponentProps<"pre">) {
  return (
    <>
      <pre {...props} />
      <CopyButton />
    </>
  );
}
