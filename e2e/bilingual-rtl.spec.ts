import { test, expect } from "@playwright/test";

test.describe("Bilingual LTR & RTL Rendering", () => {
  test("French route renders with LTR layout", async ({ page }) => {
    await page.goto("/fr");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "ltr");
    await expect(html).toHaveAttribute("lang", /^fr/);

    const heroHeading = page.locator("h1");
    await expect(heroHeading).toContainText(/dentiste/i);
  });

  test("Arabic route renders with RTL layout and Arabic typography", async ({ page }) => {
    await page.goto("/ar");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", /^ar/);

    const heroHeading = page.locator("h1");
    await expect(heroHeading).toContainText(/طبيب أسنان/);

    // Check Arabic city card
    const cityPill = page.locator("a").filter({ hasText: "الدار البيضاء" }).first();
    await expect(cityPill).toBeVisible();
  });
});
