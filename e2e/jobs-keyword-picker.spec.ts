import { test, expect } from "@playwright/test";
import { createHmac } from "node:crypto";
import fs from "node:fs";

/**
 * Jobs console: keyword picker and run deletion.
 *
 * Authenticates by minting the same signed cookie the login action sets, because
 * the interactive login path needs a reachable database, which CI does not
 * always provide. The signature is computed exactly as `lib/admin/auth.ts` does.
 */
const env = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
// dotenv values may be quoted, and the quotes are not part of the secret.
const unquote = (raw: string | undefined) => (raw ?? "").trim().replace(/^["']|["']$/g, "");
const secret =
  unquote(/ADMIN_SESSION_SECRET=(.*)/.exec(env)?.[1]) || unquote(/ADMIN_PASSWORD=(.*)/.exec(env)?.[1]);

// Without a secret there is no session to mint, and the console would just
// redirect to the login form.
test.skip(!secret, "No admin secret in .env.local; skipping the jobs console test.");

test.use({ storageState: undefined });

test.beforeEach(async ({ context }) => {
  const expiry = Date.now() + 60 * 60 * 1000;
  const session = `${expiry}.${createHmac("sha256", secret).update(String(expiry)).digest("base64url")}`;
  await context.addCookies([
    { name: "dd_admin_session", value: session, domain: "localhost", path: "/" },
  ]);
});

test("keyword picker prices a run and delete affordances render", async ({ page }) => {
  await page.goto("/admin/jobs");

  // The picker replaced the old "Keywords mode" dropdown.
  await expect(page.getByRole("heading", { name: "SerpApi clinic sync" })).toBeVisible();
  await expect(page.locator('select[name="keywordMode"]')).toHaveCount(0);

  const chips = page.locator('input[name="keywords"]');
  // Derived from the catalogue rather than hardcoded, so growing
  // DENTAL_KEYWORD_GROUPS does not silently invalidate this spec.
  const keywordCount = await chips.count();
  expect(keywordCount).toBeGreaterThan(0);

  // The campaign form above carries its own `city` filter, so scope to the form
  // that owns the keyword chips rather than matching the name page-wide.
  const syncForm = page.locator('form:has(input[name="keywords"])');
  const cityOptions = await syncForm
    .locator('select[name="city"] option')
    .first()
    .textContent();
  const cityCount = Number(cityOptions?.match(/\((\d+)\)/)?.[1] ?? 0);
  expect(cityCount).toBeGreaterThan(0);

  // Default: one keyword over every city.
  await expect(page.getByText(new RegExp(`1 keyword × ${cityCount} cities`)).first()).toBeVisible();

  // Selecting everything prices the full catalogue across every city.
  await page.getByRole("button", { name: /Select all/ }).click();
  await expect(
    page.getByText(new RegExp(`${keywordCount} keywords × ${cityCount} cities`)).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByText(/No keyword selected/).first()).toBeVisible();

  // One keyword on one city is one credit.
  await page.getByRole("button", { name: /Primary only/ }).click();
  await page.getByRole("combobox", { name: "Target" }).selectOption("tanger");
  await expect(page.getByText(/1 keyword × 1 city/).first()).toBeVisible();

  await expect(page.getByRole("button", { name: "Start sync" })).toBeEnabled();
  await expect(page.getByText(/Deleting a run only clears its history/)).toBeVisible();

  await page.screenshot({ path: "test-results/jobs-keyword-picker.png", fullPage: true });
});