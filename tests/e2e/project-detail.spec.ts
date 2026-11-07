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
  await expect(features).toHaveCount(6);
  await expect(features.filter({ hasText: "Weekly meal planner" })).toContainText("PR open");
  await expect(features.filter({ hasText: "Weekly meal planner" })).toContainText("Checks passing");
  await expect(
    features.filter({ hasText: "Weekly meal planner" }).getByRole("link", { name: /Preview/ }),
  ).toBeVisible();
  await expect(features.filter({ hasText: "Shopping list" })).toContainText("Copilot working");
  await expect(features.filter({ hasText: "Dark mode" })).toContainText("Queued");
});

test("queue panel submits, approves, rejects, pauses, and resumes features", async ({ page }) => {
  await page.goto("/projects/demo-factory/recipe-box");
  const panel = page.getByTestId("queue-panel");
  const before = await panel.getByTestId("queue-item").count();

  await panel.getByLabel("New feature title").fill("Print a recipe card");
  await panel.getByLabel("New feature details").fill("Given a recipe, when I print, then...");
  await panel.getByRole("button", { name: "Submit for approval" }).click();
  await expect(panel.getByRole("status")).toContainText("Approve it below");
  const pending = panel.getByTestId("pending-item");
  await expect(pending.filter({ hasText: "Print a recipe card" })).toBeVisible();
  await expect(panel.getByTestId("queue-item")).toHaveCount(before);

  await pending
    .filter({ hasText: "Recipe ratings" })
    .getByRole("button", { name: "Reject" })
    .click();
  await expect(pending.filter({ hasText: "Recipe ratings" })).toHaveCount(0);
  await pending
    .filter({ hasText: "Print a recipe card" })
    .getByRole("button", { name: "Approve" })
    .click();
  await expect(panel.getByTestId("approval-list")).toHaveCount(0);
  await expect(panel.getByTestId("queue-item")).toHaveCount(before + 1);

  await panel.getByRole("button", { name: "Pause" }).click();
  await expect(panel.getByTestId("queue-paused")).toBeVisible();
  await panel.getByRole("button", { name: "Resume" }).click();
  await expect(panel.getByTestId("queue-paused")).toHaveCount(0);
});

test("merges an open PR from the project page", async ({ page }) => {
  await page.goto("/projects/demo-factory/recipe-box");
  const planner = page.getByTestId("feature-item").filter({ hasText: "Weekly meal planner" });
  await planner.getByRole("button", { name: "Merge PR #8" }).click();
  await expect(planner).toContainText("Done");
  await expect(planner.getByRole("button", { name: /Merge/ })).toHaveCount(0);
});

test("production links use the Vercel-assigned alias or show not deployed", async ({ page }) => {
  await page.goto("/");
  const recipeBox = page.locator("article", { hasText: "recipe-box" });
  await expect(recipeBox.getByRole("link", { name: /Production/ })).toHaveAttribute(
    "href",
    "https://recipe-box-demo-factory.vercel.app",
  );
  const petSitter = page.locator("article", { hasText: "pet-sitter" });
  await expect(petSitter.getByTestId("not-deployed")).toHaveText("Not deployed yet");
  await expect(petSitter.getByRole("link", { name: /Production/ })).toHaveCount(0);

  await page.goto("/projects/demo-factory/pet-sitter");
  await expect(page.getByTestId("not-deployed")).toBeVisible();
  await expect(page.getByTestId("production")).toContainText("No production deployment yet.");
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
