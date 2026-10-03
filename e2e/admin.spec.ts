import { expect, test } from "@playwright/test";

/**
 * Admin area end-to-end.
 *
 * Exercises the full loop the old Strapi webhook used to drive: authenticate,
 * create an article, see it published on the public blog in both languages,
 * then unpublish and delete it, leaving the table as it was found.
 *
 * The password comes from ADMIN_PASSWORD so the test never hardcodes a secret.
 */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "change-me-local";

const FR_TITLE = "Article de vérification Playwright";
const AR_TITLE = "مقال تحقق Playwright";
const SLUG = "playwright-verification-post";

/** Seed data already in the database, asserted before and after the test. */
const SEEDED_POSTS = 6;

test.describe("admin article lifecycle", () => {
  test("create, publish, verify publicly, then delete", async ({ page }) => {
    // 1. Signed out, the dashboard bounces to the login form.
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByLabel("Admin password")).toBeVisible();

    // 2. A wrong password is rejected and leaves the operator signed out.
    await page.getByLabel("Admin password").fill("definitely-wrong");
    await page.getByRole("button", { name: "Sign in" }).click();
    // Scope to the form paragraph: Next's route announcer also has role="alert".
    await expect(page.locator('p[role="alert"]')).toContainText("Incorrect password");

    // 3. The real password establishes a session.
    await page.getByLabel("Admin password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin$/);

    // The session cookie is httpOnly, so it must not be readable from JS.
    const visibleCookies = await page.context().cookies();
    const session = visibleCookies.find((cookie) => cookie.name === "dd_admin_session");
    expect(session?.httpOnly).toBe(true);

    // 4. The listing shows the seeded articles and none of ours yet.
    // Remove any post left behind by an interrupted earlier run so the test is
    // idempotent rather than depending on a clean database.
    await page.goto("/admin/articles");
    const leftover = page.getByRole("row").filter({ hasText: SLUG });
    if (await leftover.count()) {
      await leftover.getByRole("button", { name: "Delete" }).click();
      await expect(page).toHaveURL(/\/admin\/articles$/);
    }

    await expect(page.getByRole("link", { name: /Comment choisir le bon dentiste/ })).toBeVisible();
    await expect(page.getByRole("link", { name: FR_TITLE })).toHaveCount(0);

    // 5. Create the article in both languages.
    await page.goto("/admin/articles/new");
    // The form is a client component: inputs are usable pre-hydration, but the
    // Radix tab handlers are not attached until React hydrates.
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Slug").fill(SLUG);

    // The French tab is selected by default; fill it before switching.
    await page.getByLabel("Title (French)").fill(FR_TITLE);
    await page.getByLabel("Excerpt (French)").fill("Résumé de vérification.");
    await page.getByLabel("Body (French)").fill("Premier paragraphe.\n\nSecond paragraphe.");

    const arabicTab = page.getByRole("tab", { name: "العربية" });
    await arabicTab.click();
    // Assert the switch took effect: a click before hydration silently no-ops.
    await expect(arabicTab).toHaveAttribute("data-state", "active");
    await page.getByLabel("Title (Arabic)").fill(AR_TITLE);
    await page.getByLabel("Excerpt (Arabic)").fill("ملخص التحقق.");
    await page.getByLabel("Body (Arabic)").fill("الفقرة الأولى.\n\nالفقرة الثانية.");

    await page.getByLabel("Status").selectOption("PUBLISHED");
    await page.getByRole("button", { name: "Create article" }).click();

    await expect(page).toHaveURL(/\/admin\/articles\/[0-9a-f-]+\?saved=1/);
    await expect(page.getByText("Article created.")).toBeVisible();

    // 6. It is now publicly reachable in both languages, from the database.
    await page.goto(`/fr/blog/${SLUG}`);
    await expect(page.getByRole("heading", { name: FR_TITLE })).toBeVisible();
    await expect(page.getByText("Premier paragraphe.")).toBeVisible();
    await expect(page.getByText("Second paragraphe.")).toBeVisible();

    await page.goto(`/ar/blog/${SLUG}`);
    await expect(page.getByRole("heading", { name: AR_TITLE })).toBeVisible();
    await expect(page.getByText("الفقرة الأولى.")).toBeVisible();

    // The listing page picks it up too.
    await page.goto("/fr/blog");
    await expect(page.getByRole("link", { name: FR_TITLE })).toBeVisible();

    // 7. Unpublishing hides it from the public blog but keeps the record.
    // The publish/unpublish and delete controls are per-row in the listing, so
    // scope to the row for this article rather than matching every row's button.
    await page.goto("/admin/articles");
    const row = page.getByRole("row").filter({ hasText: FR_TITLE });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Unpublish" }).click();

    await expect(row.getByRole("button", { name: "Publish" })).toBeVisible();
    await expect(row).toContainText("Draft");

    await page.goto(`/fr/blog/${SLUG}`);
    await expect(page.getByText("404")).toBeVisible();

    // Still present in the admin, as a draft.
    await page.goto("/admin/articles");
    await expect(page.getByRole("link", { name: FR_TITLE })).toBeVisible();

    // 8. Delete it, and confirm the seeded articles were untouched.
    await page.getByRole("row").filter({ hasText: FR_TITLE }).getByRole("button", { name: "Delete" }).click();

    await expect(page).toHaveURL(/\/admin\/articles$/);
    await expect(page.getByRole("link", { name: FR_TITLE })).toHaveCount(0);

    await page.goto("/fr/blog");
    await expect(page.getByRole("link", { name: FR_TITLE })).toHaveCount(0);
    await expect(page.locator('a[href^="/fr/blog/"]')).toHaveCount(SEEDED_POSTS);

    // 9. Signing out revokes access.
    await page.goto("/admin");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin/articles");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("robots.txt keeps the admin out of search engines", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.ok()).toBeTruthy();
    expect(await response.text()).toContain("Disallow: /admin");
  });

  test("page SEO override applies to one locale only, then removes cleanly", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Admin password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin$/);

    const OVERRIDE = "Blog Dentistique — Casablanca";

    // Record the generated French title so we can prove it is untouched.
    await page.goto("/fr/blog");
    const frenchTitle = await page.title();
    expect(frenchTitle).not.toContain(OVERRIDE);

    // Add an override for the blog index in Arabic only.
    await page.goto("/admin/seo");
    const addForm = page.locator("section").last().locator("form");
    await addForm.locator('select[name="routeKey"]').selectOption("blog");
    await addForm.locator('select[name="locale"]').selectOption("ar");
    await addForm.locator('input[name="metaTitle"]').fill(OVERRIDE);
    await addForm.getByRole("button", { name: "Save" }).click();
    await expect(addForm.getByText("Saved.")).toBeVisible();

    // It reaches the Arabic listing's <title>.
    await page.goto("/ar/blog");
    await expect(page).toHaveTitle(new RegExp("Blog Dentistique"));

    // The French listing is unaffected: overrides are per route *and* locale.
    await page.goto("/fr/blog");
    expect(await page.title()).toBe(frenchTitle);

    // Remove it, and confirm the generated title comes back.
    await page.goto("/admin/seo");
    const existing = page.locator("details").filter({ hasText: OVERRIDE });
    await expect(existing).toHaveCount(1);
    // The override list is a collapsed <details>; its controls only exist
    // visually once expanded.
    await existing.locator("summary").click();
    await existing.getByRole("button", { name: "Remove override" }).click();
    await expect(page.locator("details").filter({ hasText: OVERRIDE })).toHaveCount(0);

    await page.goto("/ar/blog");
    expect(await page.title()).not.toContain("Blog Dentistique");
  });
});