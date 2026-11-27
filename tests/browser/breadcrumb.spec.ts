import { expect, test, type Page } from "@playwright/test";

// The navbar wordmark carries the current path, which is as long as the slug.
// It must shorten itself rather than run into the controls beside it, at any
// width and on any page. These pin that with geometry: the breadcrumb's right
// edge stays left of whatever comes next in the bar.

const LONG_POST = "/blog/the-mean-reversion-you-cant-trade";
const LONG_TAG = `/blog/tag/${encodeURIComponent("a-tag-name-long-enough-to-overflow-any-phone-navbar")}`;

async function gapToNextControl(page: Page): Promise<number> {
  return page.evaluate(() => {
    const crumb = document.querySelector('header nav[aria-label="Breadcrumb"]');
    if (!crumb) return -999;
    const right = crumb.getBoundingClientRect().right;
    // The nearest visible control after the breadcrumb in the bar: the main
    // nav on desktop, the search button on a phone.
    // Scoped to the navbar: a post has its own <header> with links in it.
    const bar = crumb.closest("header");
    if (!bar) return -999;
    const after = [...bar.querySelectorAll("a, button")]
      .filter((el) => {
        const box = el.getBoundingClientRect();
        return (
          box.width > 0 &&
          !crumb.contains(el) &&
          crumb.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING
        );
      })
      .map((el) => el.getBoundingClientRect().left);
    return Math.min(...after) - right;
  });
}

for (const path of [LONG_POST, LONG_TAG]) {
  test(`breadcrumb never reaches the next control on ${path}`, async ({
    page,
  }) => {
    // A missing tag is a 404, which still renders the navbar with the path.
    await page.goto(path);
    const crumb = page.locator('header nav[aria-label="Breadcrumb"]');
    await expect(crumb).toBeVisible();

    // The last segment gives way, not the controls.
    await expect.poll(() => gapToNextControl(page)).toBeGreaterThanOrEqual(0);

    // And the bar itself never overflows the viewport.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("breadcrumb clears the main nav at the narrowest desktop width", async ({
  page,
}) => {
  // md is where the main nav appears beside the breadcrumb: the tightest fit.
  await page.setViewportSize({ width: 768, height: 800 });
  await page.goto(LONG_POST);
  await expect(page.locator('header nav[aria-label="Main"]')).toBeVisible();
  await expect.poll(() => gapToNextControl(page)).toBeGreaterThanOrEqual(0);
});

test("parent segments link back up", async ({ page }) => {
  await page.goto(LONG_POST);
  await page
    .locator('header nav[aria-label="Breadcrumb"]')
    .getByRole("link", { name: "blog", exact: true })
    .click();
  await expect(page).toHaveURL(/\/blog$/);
});
