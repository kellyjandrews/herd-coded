import { expect, test } from "@playwright/test";

// Relies on seeded mock data; deployed previews run without USE_MOCKS.
test.skip(Boolean(process.env.BASE_URL), "mock-data tests run against the local mock server");
test.describe.configure({ mode: "serial" });

test("dashboard links to a project detail page with features, PRs, and production", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("mock-mode")).toBeVisible();
  await page.getByRole("link", { name: "recipe-box", exact: true }).click();

  await expect(page).toHaveURL(/\/projects\/demo-factory\/recipe-box$/);
  await expect(page.getByTestId("project-title")).toHaveText("recipe-box");
  await expect(page.getByTestId("production")).toContainText("Ready");

  const features = page.getByTestId("feature-item");
  await expect(features).toHaveCount(5);
  await expect(features.filter({ hasText: "Weekly meal planner" })).toContainText("PR open");
  await expect(features.filter({ hasText: "Weekly meal planner" })).toContainText("Checks passing");
  await expect(
    features.filter({ hasText: "Weekly meal planner" }).getByRole("link", { name: /Preview/ }),
  ).toBeVisible();
  await expect(features.filter({ hasText: "Shopping list" })).toContainText("Copilot working");
  await expect(features.filter({ hasText: "Dark mode" })).toContainText("Queued");
});

test("queue panel adds, pauses, and resumes features", async ({ page }) => {
  await page.goto("/projects/demo-factory/recipe-box");
  const panel = page.getByTestId("queue-panel");
  const before = await panel.getByTestId("queue-item").count();

  await panel.getByLabel("New feature title").fill("Print a recipe card");
  await panel.getByLabel("New feature details").fill("Given a recipe, when I print, then...");
  await panel.getByRole("button", { name: "Add to queue" }).click();
  await expect(panel.getByRole("status")).toContainText(`position ${before + 1}`);
  await expect(panel.getByTestId("queue-item")).toHaveCount(before + 1);

  await panel.getByRole("button", { name: "Pause" }).click();
  await expect(panel.getByTestId("queue-paused")).toBeVisible();
  await panel.getByRole("button", { name: "Resume" }).click();
  await expect(panel.getByTestId("queue-paused")).toHaveCount(0);
});

test("unknown projects show not found", async ({ page }) => {
  await page.goto("/projects/demo-factory/does-not-exist");
  await expect(page.getByTestId("project-not-found")).toBeVisible();
});

test("dashboard repairs a project that needs it", async ({ page }) => {
  await page.goto("/");
  const row = page.locator("article", { hasText: "trail-tracker" });
  await expect(row.getByTestId("needs-repair")).toBeVisible();
  await row.getByRole("button", { name: "Repair" }).click();
  await expect(row.getByTestId("needs-repair")).toHaveCount(0);
});
