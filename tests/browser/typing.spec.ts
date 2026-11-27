import { expect, test } from "@playwright/test";

// Regression coverage for the mobile-Safari typewriter clip: the /about eyebrow
// rendered "ABOU" because the reveal stopped one glyph short. This runs under
// WebKit (the engine where it reproduced) and asserts geometry, not pixels.
//
// The index pages no longer carry typed eyebrows (the navbar's path took that
// job), so this now covers the labels that still type: the hero's path and the
// home page's section labels, which include five-letter "About"-length words.

test("home page typed labels finish without clipping", async ({ page }) => {
  await page.goto("/");
  const typed = page.locator(".typed-text");
  await expect(typed.first()).toBeAttached();

  const count = await typed.count();
  expect(count).toBeGreaterThan(1);

  for (let i = 0; i < count; i++) {
    const label = typed.nth(i);
    await label.scrollIntoViewIfNeeded();
    // No horizontal clipping once the reveal settles: the visible layer's
    // content fits its box. Under the old bug the last glyph overflowed the
    // clip box (scrollWidth > clientWidth). Poll to absorb the reveal duration
    // and the frame where the element reverts to its base width.
    await expect
      .poll(() => label.evaluate((el) => el.scrollWidth - el.clientWidth), {
        timeout: 5_000,
      })
      .toBeLessThanOrEqual(1);
  }

  // The accessible full label is always present, animation aside.
  for (const label of ["~/glyn.dev", "Projects", "Blog", "Research"]) {
    await expect(
      page.locator(".typed .sr-only", { hasText: label }).first(),
    ).toBeAttached();
  }
});
