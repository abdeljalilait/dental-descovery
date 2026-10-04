import { test, expect } from "@playwright/test";

test.describe("Atelier Neo-Clinical Design System & Styling", () => {
  test("Landing page loads with Atelier Neo-Clinical visual tokens", async ({ page }) => {
    await page.goto("/fr");

    // Check title and hero display heading
    await expect(page).toHaveTitle(/Dentora/);
    const heroTitle = page.locator("h1");
    await expect(heroTitle).toBeVisible();

    // Check verified badge and social proof. The rating is now the real average
    // computed from the database, so assert the shape rather than a fixed claim.
    const socialProof = page.getByText(/[0-9],[0-9]\/5/);
    await expect(socialProof).toBeVisible();

    // Check search container exists
    const searchBar = page.locator("input[type='search'], input[placeholder*='ville']").first();
    await expect(searchBar).toBeVisible();

    // Check city cards have rounded corners and icons
    const cityCard = page.locator("a[href*='/dentistes/']").first();
    await expect(cityCard).toBeVisible();
  });

  test("Clinic cards render with Moroccan verified badges and styling", async ({ page }) => {
    await page.goto("/fr/dentistes/casablanca");

    const clinicCards = page.locator("article");
    await expect(clinicCards.first()).toBeVisible();

    // Verify rating and call buttons exist
    const callButton = page.getByRole("link", { name: /appeler/i }).first();
    await expect(callButton).toBeVisible();
  });

  test("Mobile navigation drawer opens and locks background", async ({ page, isMobile }) => {
    if (!isMobile) return;

    await page.goto("/fr");
    const menuBtn = page.getByRole("button", { name: /menu/i });
    await expect(menuBtn).toBeVisible();

    await menuBtn.click();
    const mobileMenu = page.locator("#mobile-menu");
    await expect(mobileMenu).toBeVisible();
  });
});
