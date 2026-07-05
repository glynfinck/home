import { expect, test } from "@playwright/test";

// The mobile nav is a full-screen sheet toggled by the "Open menu" button,
// which only shows below the md breakpoint (the iPhone profile is mobile-width).

test("mobile nav opens and navigates", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Open menu" }).click();

  const blogLink = page.getByRole("link", { name: "Blog" });
  await expect(blogLink).toBeVisible();

  await blogLink.click();
  await expect(page).toHaveURL(/\/blog$/);
});
