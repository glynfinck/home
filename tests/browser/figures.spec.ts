import { expect, test } from "@playwright/test";

const POST = "/blog/the-mean-reversion-you-cant-trade";

/**
 * The fee slider is the site's signature figure, and its correctness claim is
 * that net PnL is recomputed exactly rather than interpolated between baked
 * curves. These pin the numbers the surrounding prose states.
 */
test.describe("interactive figure", () => {
  test("renders server-side at the paper's baseline fee", async ({ page }) => {
    // `domcontentloaded`, not `load`: the assertion is specifically that the
    // chart is in the initial HTML rather than drawn after hydration.
    await page.goto(POST, { waitUntil: "domcontentloaded" });

    const figure = page.locator("figure", { hasText: "Cumulative net PnL" });
    await expect(figure).toBeVisible();
    await expect(figure.locator("svg path[stroke]").first()).toBeVisible();
    await expect(figure).toContainText("$1,896");
    await expect(figure).toContainText("14.3 bps");
  });

  test("the slider drives the readout to a loss at realistic fees", async ({
    page,
  }) => {
    await page.goto(POST);
    const figure = page.locator("figure", { hasText: "Cumulative net PnL" });
    const slider = figure.getByLabel("Fee per side");

    await expect(figure).toContainText("$1,896");

    // Kraken's real taker tier, well past the 14.3 bps break-even.
    await slider.fill("24");
    await expect(figure).toContainText("-$1,496");
    await expect(figure).toContainText("At 24 bps the edge is gone.");
  });

  test("the slider is operable from the keyboard", async ({ page }) => {
    await page.goto(POST);
    const slider = page
      .locator("figure", { hasText: "Cumulative net PnL" })
      .getByLabel("Fee per side");

    await slider.focus();
    const before = await slider.inputValue();
    await slider.press("ArrowRight");
    expect(Number(await slider.inputValue())).toBeGreaterThan(Number(before));
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
  test("collapse behind their marker on mobile and expand on tap", async ({
    page,
  }) => {
    await page.goto(POST);

    const note = page.locator("span.sidenote").first();
    // Below xl the note is hidden until its numbered marker is activated.
    await expect(note).toBeHidden();

    await page.locator("label.sidenote-ref").first().click();
    await expect(note).toBeVisible();
  });
});
