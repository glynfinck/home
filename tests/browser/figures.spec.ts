import { expect, test } from "@playwright/test";

const POST = "/blog/the-mean-reversion-you-cant-trade";

/**
 * The live numbers under the plot. Every value here also appears in the
 * figure's data table, so assertions have to be scoped to this element to
 * actually prove the readout is updating.
 */
const readout = (figure: import("@playwright/test").Locator) =>
  figure.locator("dl");

/**
 * The fee slider is the site's signature figure, and its correctness claim is
 * that net PnL is recomputed exactly rather than interpolated between baked
 * curves. These pin the numbers the surrounding prose states.
 */
test.describe("interactive figure", () => {
  test("renders server-side at the paper's baseline fee", async ({ page, request }) => {
    // Asserted against the raw response rather than the DOM: a live Vega view
    // replaces the server-rendered SVG shortly after hydration, so a DOM query
    // proves nothing about what arrived in the HTML. This is the check that
    // the figure survives with JavaScript off, and on paper.
    const html = await (await request.get(POST)).text();
    // Vega writes its own namespace attributes first, so `class` is not the
    // first attribute on the element.
    expect(html).toMatch(/<svg[^>]*class="marks"/);
    expect(html).toMatch(/<path[^>]*stroke="var\(--brand\)"/);

    await page.goto(POST, { waitUntil: "domcontentloaded" });

    const figure = page.locator("figure", { hasText: "Cumulative net PnL" });
    await expect(figure).toBeVisible();
    await expect(figure.locator("svg.marks path[stroke]").first()).toBeAttached();

    // Scoped to the readout, not the whole figure: the data table also lists
    // every one of these numbers, so a figure-wide assertion would pass even
    // if the readout were empty.
    await expect(readout(figure)).toContainText("$1,896");
    await expect(readout(figure)).toContainText("14.3 bps");
  });

  test("the slider drives the readout to a loss at realistic fees", async ({
    page,
  }) => {
    await page.goto(POST);
    const figure = page.locator("figure", { hasText: "Cumulative net PnL" });
    const slider = figure.getByLabel("Fee per side");

    await expect(readout(figure)).toContainText("$1,896");

    // Retried as a unit. The chart renders server-side, so the slider exists
    // and accepts a value before React has attached its handler; on a slow
    // machine an un-retried fill lands in that gap and the readout never
    // moves. Retrying re-fills until hydration has caught up.
    await expect(async () => {
      // Kraken's real taker tier, well past the 14.3 bps break-even.
      await slider.fill("24");
      await expect(readout(figure)).toContainText("-$1,496", {
        timeout: 1_000,
      });
    }).toPass({ timeout: 20_000 });

    await expect(figure).toContainText("At 24 bps the edge is gone.");
  });

  test("the slider is operable from the keyboard", async ({ page }) => {
    await page.goto(POST);
    const slider = page
      .locator("figure", { hasText: "Cumulative net PnL" })
      .getByLabel("Fee per side");

    await slider.focus();
    const before = Number(await slider.inputValue());
    await expect(async () => {
      await slider.press("ArrowRight");
      expect(Number(await slider.inputValue())).toBeGreaterThan(before);
    }).toPass({ timeout: 10_000 });
  });

  /**
   * Every figure is server-rendered first, then handed to a live Vega view
   * that brings the library's tooltips with it. The static figures had no
   * pointer read-out at all on the first pass and nothing caught it, hence
   * this test.
   *
   * The tooltip is vega-tooltip's single `#vg-tooltip-element`, appended to
   * <body> rather than to the figure, so it is asserted on the page.
   */
  test("a static figure reads out its values on hover", async ({ page }) => {
    await page.goto(POST);
    const figure = page.locator("figure", { hasText: "crossover is validated" });
    await figure.scrollIntoViewIfNeeded();

    // The live view replaces the server-rendered copy once Vega has loaded.
    const live = figure.locator("svg.marks:visible").last();
    await expect(live).toBeVisible();

    const tooltip = page.locator("#vg-tooltip-element");

    await expect(async () => {
      // The invisible point layer exists so a hover near the curve counts;
      // targeting it directly keeps the test off pixel coordinates.
      const hits = live.locator("g.mark-symbol path");
      const count = await hits.count();
      expect(count).toBeGreaterThan(0);

      await hits.nth(Math.floor(count / 2)).hover({ force: true });
      await expect(tooltip).toBeVisible({ timeout: 1_000 });
      // Series and value together: either alone would be useless.
      await expect(tooltip).toContainText("Representation");
      await expect(tooltip).toContainText("Relative error");
    }).toPass({ timeout: 20_000 });
  });

  test("every plotted value is reachable without hovering", async ({ page }) => {
    await page.goto(POST);
    const figure = page.locator("figure", { hasText: "Cumulative net PnL" });

    // The data table is the non-hover route to the numbers, and the
    // accessible equivalent of the plot.
    await figure.getByText("Show data").click();
    const table = figure.locator("table");
    await expect(table).toBeVisible();
    await expect(table).toContainText("Win rate");
    await expect(table.locator("tbody tr")).not.toHaveCount(0);
  });
});

test.describe("command palette", () => {
  test("opens from the visible trigger and finds a post", async ({ page }) => {
    await page.goto("/");

    // Discoverability matters more than the chord here: a touch device has no
    // ⌘K, so the button is the only way in.
    await page.getByRole("button", { name: "Search" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await page.keyboard.type("mean rev");
    await expect(
      dialog.getByText("The mean reversion you can't trade"),
    ).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp("/blog/the-mean-reversion"));
  });

  test("escape closes it", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});

test.describe("sidenotes", () => {
  // Exercised on the fixture post: the production articles are mirrored
  // verbatim in the seed, so test-only markup must not be added to them.
  test("collapse behind their marker on mobile and expand on tap", async ({
    page,
  }) => {
    await page.goto("/blog/momentum-signal-decay");

    const note = page.locator("span.sidenote").first();
    // Below xl the note is hidden until its numbered marker is activated.
    await expect(note).toBeHidden();

    await page.locator("label.sidenote-ref").first().click();
    await expect(note).toBeVisible();
  });
});

test.describe("table of contents", () => {
  /**
   * The navbar is sticky, so an un-offset anchor jump lands the heading at the
   * viewport top and behind the bar. `scroll-margin-top` in globals.css is
   * what keeps it visible, and nothing else would catch its removal.
   */
  test("a contents link lands the heading below the sticky navbar", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(POST);

    await page
      .locator('nav[aria-labelledby="toc-heading"] a', {
        hasText: "Building the machine",
      })
      .click();

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const heading = [...document.querySelectorAll("h2")].find((h) =>
            h.textContent?.includes("Building the machine"),
          );
          const header = document.querySelector("header");
          if (!heading || !header) return -1;
          return Math.round(
            heading.getBoundingClientRect().top -
              header.getBoundingClientRect().bottom,
          );
        }),
      )
      .toBeGreaterThanOrEqual(0);
  });
});
