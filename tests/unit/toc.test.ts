import { describe, expect, it } from "vitest";
import GithubSlugger from "github-slugger";

import { extractToc } from "@/lib/toc";

describe("extractToc", () => {
  it("pulls h2 and h3, ignoring h1 and h4", () => {
    const toc = extractToc(
      ["# Title", "## Two", "### Three", "#### Four"].join("\n"),
    );
    expect(toc).toEqual([
      { depth: 2, text: "Two", id: "two" },
      { depth: 3, text: "Three", id: "three" },
    ]);
  });

  it("ignores headings inside fenced code", () => {
    const source = [
      "## Real",
      "```python",
      "# not a heading",
      "## also not a heading",
      "```",
      "## Also real",
    ].join("\n");

    expect(extractToc(source).map((e) => e.text)).toEqual(["Real", "Also real"]);
  });

  it("does not close a ``` block on a ~~~ line", () => {
    const source = ["```", "~~~", "## hidden", "```", "## visible"].join("\n");
    expect(extractToc(source).map((e) => e.text)).toEqual(["visible"]);
  });

  it("strips inline markdown so the label matches the rendered text", () => {
    const toc = extractToc(
      "## The **paper** that `took` it [over](https://example.com)",
    );
    expect(toc[0].text).toBe("The paper that took it over");
    expect(toc[0].id).toBe("the-paper-that-took-it-over");
  });

  /**
   * The whole feature silently breaks if these ever diverge: links render,
   * they just scroll nowhere. rehype-slug drives one github-slugger over the
   * document, so duplicates must collide into the same -1/-2 suffixes.
   */
  it("matches rehype-slug's suffixing for duplicate headings", () => {
    const toc = extractToc(["## Setup", "## Setup", "## Setup"].join("\n"));

    const slugger = new GithubSlugger();
    const expected = ["Setup", "Setup", "Setup"].map((t) => slugger.slug(t));

    expect(toc.map((e) => e.id)).toEqual(expected);
    expect(toc.map((e) => e.id)).toEqual(["setup", "setup-1", "setup-2"]);
  });

  it("returns nothing for prose with no headings", () => {
    expect(extractToc("Just a paragraph.\n\nAnd another.")).toEqual([]);
  });
});
