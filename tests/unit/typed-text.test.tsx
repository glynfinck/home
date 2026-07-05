import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TypedText } from "@/components/site/typed-text";

// The typewriter is CSS-only (see globals.css). These tests pin two things:
//   1. the component contract — the full text is always in the DOM, so
//      crawlers, no-JS, and screen readers never see a truncated label; and
//   2. the reveal geometry — a regression guard for the mobile Safari bug
//      where revealing to `100% - caret` permanently clipped the last glyph
//      (rendered "About" as "ABOU"). The fix reveals to the full width and
//      absorbs the caret gutter with a negative margin.

describe("TypedText component contract", () => {
  it("always renders the full text (accessible + SSR-complete)", () => {
    const html = renderToStaticMarkup(<TypedText text="About" />);
    // sr-only + sizer + visible layers => the label appears three times.
    expect(html.match(/About/g)).toHaveLength(3);
    // A screen-reader-only copy carries the accessible name.
    expect(html).toContain('class="sr-only"');
  });

  it("keeps the full text even before the animation runs (static state)", () => {
    const html = renderToStaticMarkup(<TypedText text="Projects" run={false} />);
    expect(html).toContain('data-typed="static"');
    expect(html.match(/Projects/g)).toHaveLength(3);
  });

  it("exposes run state and caret mode via data attributes", () => {
    const running = renderToStaticMarkup(<TypedText text="Blog" caret="blink" />);
    expect(running).toContain('data-typed="run"');
    expect(running).toContain('data-caret="blink"');

    const hidden = renderToStaticMarkup(
      <TypedText text="Blog" caret="hide" />,
    );
    expect(hidden).toContain('data-caret="hide"');
  });

  it("counts steps by grapheme, not UTF-16 code units", () => {
    // steps(--typed-chars) must land one step per visible glyph. Spreading the
    // string (not .length) is why an astral emoji counts as one character.
    const html = renderToStaticMarkup(<TypedText text="hi🚀" />);
    expect(html).toContain("--typed-chars:3"); // h, i, 🚀 — not 4 UTF-16 units
  });

  it("passes speed and delay through as CSS custom properties", () => {
    const html = renderToStaticMarkup(
      <TypedText text="x" speedMs={45} delayMs={250} />,
    );
    expect(html).toContain("--typed-speed:45ms");
    expect(html).toContain("--typed-delay:250ms");
  });
});

describe("typewriter reveal geometry (mobile-clip regression guard)", () => {
  const css = readFileSync(
    fileURLToPath(new URL("../../app/globals.css", import.meta.url)),
    "utf8",
  );

  it("reveals to the full text width, never `100% - caret`", () => {
    // The `to` frame must reach the full width so the final glyph is always
    // shown regardless of font metrics. Reverting to `100% - caret` reclips it.
    expect(css).toMatch(
      /@keyframes typed-reveal\s*\{[\s\S]*?to\s*\{\s*width:\s*100%;/,
    );
    expect(css).not.toMatch(
      /@keyframes typed-reveal\s*\{[\s\S]*?width:\s*calc\(100% -/,
    );
  });

  it("absorbs the caret gutter with a negative margin (zero layout shift)", () => {
    expect(css).toMatch(
      /\.typed-text\s*\{[\s\S]*?margin-right:\s*calc\(-1 \* var\(--typed-caret-w\)\)/,
    );
  });

  it("reveals with `backwards` fill, never `both`", () => {
    // A forwards/`both` fill freezes WebKit's steps() endpoint on step N-1 when
    // 1/chars isn't binary-exact (e.g. 5 chars => 0.2), reintroducing the clip.
    // `backwards` lets the element revert to its full base width when done.
    const revealDecls = css.match(/typed-reveal[^;,]*(?:,[^;]*)?/g) ?? [];
    expect(revealDecls.length).toBeGreaterThan(0);
    for (const decl of revealDecls) {
      // ignore the @keyframes definition line, only check animation shorthands
      if (decl.includes("var(--typed-duration)")) {
        expect(decl).toContain("backwards");
        expect(decl).not.toMatch(/\bboth\b/);
      }
    }
  });
});
