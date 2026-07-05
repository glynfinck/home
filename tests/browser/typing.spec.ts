import { expect, test } from "@playwright/test";

// Regression coverage for the mobile-Safari typewriter clip: the /about eyebrow
// rendered "ABOU" because the reveal stopped one glyph short. This runs under
// WebKit (the engine where it reproduced) and asserts geometry, not pixels.

const EYEBROWS = [
  { path: "/about", label: "About" },
  { path: "/blog", label: "Blog" },
  { path: "/projects", label: "Projects" },
  { path: "/research", label: "Research" },
];

for (const { path, label } of EYEBROWS) {
  test(`${path} eyebrow types the full label without clipping`, async ({
    page,
  }) => {
    await page.goto(path);
    const typed = page.locator(".typed-text").first();
    await typed.waitFor();

    // No horizontal clipping once the reveal settles: the visible layer's
    // content fits its box. Under the old bug the last glyph overflowed the
    // clip box (scrollWidth > clientWidth) — "ABOU". Poll to absorb the reveal
    // duration and the frame where the element reverts to its base width.
    await expect
      .poll(
        () => typed.evaluate((el) => el.scrollWidth - el.clientWidth),
        { timeout: 5_000 },
      )
      .toBeLessThanOrEqual(1);

    // The accessible full label is always present, animation aside.
    await expect(
      page.locator(".typed .sr-only", { hasText: label }).first(),
    ).toBeAttached();
  });
}
