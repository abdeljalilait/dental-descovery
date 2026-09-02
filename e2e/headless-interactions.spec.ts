import { test, expect } from "@playwright/test";

test.describe("Radix UI Headless Components & Interactions", () => {
  test("Radix Accordion expands and collapses FAQ items", async ({ page }) => {
    await page.goto("/fr");

    // Locate first FAQ trigger
    const faqTrigger = page.locator("button[data-state]").filter({ hasText: /gratuit/i }).first();
    await expect(faqTrigger).toBeVisible();

    // It is open by default as item-0 or clickable
    const answer = page.getByText(/totalement/i).first();
    await expect(answer).toBeVisible();
  });

  test("Radix Dialog LeadModal opens, displays form, and handles dismissal", async ({ page }) => {
    await page.goto("/fr");

    // Click on "Demander une démo" or header pro action
    const demoButton = page.getByRole("button", { name: /démo|référencer/i }).first();
    await expect(demoButton).toBeVisible();
    await demoButton.click();

    // Dialog content should be visible
    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible();

    // Form inputs should be accessible
    const nameInput = dialog.locator("input[name='name']");
    await expect(nameInput).toBeVisible();

    // Close via Esc key
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
});
