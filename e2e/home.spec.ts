import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should load home page and display title and description", async ({ page }) => {
    await page.goto("/");

    // Verify main heading exists and has expected text
    const heading = page.locator("h1").first();
    await expect(heading).toContainText("NITECH ESTIMATES");

    // Verify the description paragraph is visible
    const desc = page.locator("p", { hasText: "A premium, professional engineering suite" });
    await expect(desc).toBeVisible();

    // Verify button exists and points to /estimate-builder
    const ctaButton = page.locator("a", { hasText: "Open Estimate Builder" });
    await expect(ctaButton).toBeVisible();
    await expect(ctaButton).toHaveAttribute("href", "/estimate-builder");
  });
});
