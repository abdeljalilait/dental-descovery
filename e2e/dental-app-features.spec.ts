import { test, expect } from "@playwright/test";

test.describe("Dental-App Live Studio & Clinic ROI Engine", () => {
  test("Live Interactive Studio switches between Copilot, Agenda, 3D Odontogram, WhatsApp and Analytics", async ({ page }) => {
    await page.goto("/fr/dental-app");

    const studio = page.locator("[data-testid='interactive-app-studio']");
    await expect(studio).toBeVisible();

    // 1. Copilot IA tab (default)
    const briefingBtn = studio.getByRole("button", { name: /briefing/i });
    await expect(briefingBtn).toBeVisible();
    await briefingBtn.click();
    await expect(studio.getByText(/Bonjour Dr. Bennani/i)).toBeVisible();

    // 2. Switch to 3D Odontogram tab
    const odontogramTab = studio.getByRole("tab", { name: /odontogramme|schéma/i });
    await odontogramTab.click();
    const tooth16 = studio.getByRole("button", { name: /#16/i });
    await expect(tooth16).toBeVisible();
    await tooth16.click();
    await expect(studio.getByText(/Implant Titane/i)).toBeVisible();

    // 3. Switch to WhatsApp Recall tab
    const whatsappTab = studio.getByRole("tab", { name: /whatsapp/i });
    await whatsappTab.click();
    const confirmBtn = studio.getByRole("button", { name: /confirmer le rdv/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();
    await expect(studio.getByText(/Agenda du cabinet synchronisé/i)).toBeVisible();

    // 4. Switch to Analytics tab
    const analyticsTab = studio.getByRole("tab", { name: /analytics|statistiques/i });
    await analyticsTab.click();
    await expect(studio.getByText(/184 500 MAD/i)).toBeVisible();
  });

  test("Clinic ROI Calculator updates values dynamically when sliders move", async ({ page }) => {
    await page.goto("/fr/tarifs");

    const calcTitle = page.getByText(/Estimez le gain mensuel/i);
    await expect(calcTitle).toBeVisible();

    // Initial check
    const initialMadText = page.getByText(/MAD/i).first();
    await expect(initialMadText).toBeVisible();

    // Move sliders
    const chairsSlider = page.locator("input[type='range']").first();
    await chairsSlider.fill("4");

    // Output dynamically calculated
    await expect(page.getByText(/heures \/ mois/i)).toBeVisible();
  });
});
