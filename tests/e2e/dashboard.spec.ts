import { expect, test } from "@playwright/test";

test("dashboard reports connection state and links to setup", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("connection-status")).toHaveText(
    /GitHub (connected|not configured)/,
  );
  await expect(page.getByText("Kelly's workspace")).toHaveCount(0);

  const setup = page.locator("#settings");
  await expect(setup.getByRole("heading", { name: "Setup" })).toBeVisible();
  await expect(setup.getByText("FACTORY_GITHUB_TOKEN")).toBeVisible();
  for (const anchor of ["#projects", "#remote-builds", "#settings"]) {
    await expect(page.locator(anchor)).toHaveCount(1);
  }
});

test("landing page guides users to a feature request and back to projects", async ({ page }) => {
  test.skip(Boolean(process.env.BASE_URL), "requires local mock projects");
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "What would you like to work on?" }),
  ).toBeVisible();
  const projectPicker = page.getByLabel("Choose a project for your feature request");
  await expect(projectPicker).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await projectPicker.selectOption("demo-factory/recipe-box");
  await page.getByRole("link", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/projects\/demo-factory\/recipe-box#new-feature$/);
  await expect(page.getByRole("form", { name: "Create a feature request" })).toBeVisible();
  await page.getByRole("link", { name: "All projects" }).click();
  await expect(page).toHaveURL(/\/#project-list$/);
  await expect(page.getByRole("heading", { name: "Your projects", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "pet-sitter", exact: true }).click();
  await expect(page.getByTestId("project-title")).toHaveText("pet-sitter");
});

test("empty workspace makes the next step clear", async ({ page }) => {
  await page.route("**/api/projects", async (route) => {
    await route.fulfill({
      json: { configured: true, owner: "demo-factory", projects: [] },
    });
  });
  await page.goto("/");
  await expect(page.getByText("Create a project first to request a feature.")).toBeVisible();
  await page.getByRole("button", { name: "Create your first project" }).click();
  await expect(page.getByLabel("Project name")).toBeFocused();
});

test("feature request link can be reached and activated with a keyboard", async ({ page }) => {
  test.skip(Boolean(process.env.BASE_URL), "requires local mock projects");
  await page.goto("/");
  const projectPicker = page.getByLabel("Choose a project for your feature request");
  await projectPicker.selectOption("demo-factory/recipe-box");
  await projectPicker.focus();
  await projectPicker.press("Tab");
  const continueLink = page.getByRole("link", { name: "Continue" });
  await expect(continueLink).toBeFocused();
  await continueLink.press("Enter");
  await expect(page.getByRole("form", { name: "Create a feature request" })).toBeVisible();
});

test("project loading errors are not presented as an empty workspace", async ({ page }) => {
  await page.route("**/api/projects", async (route) => {
    await route.fulfill({ status: 500, json: { error: "Could not load projects." } });
  });
  await page.goto("/");
  await expect(
    page.getByText("Projects are unavailable. Refresh the page to try again."),
  ).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "Could not load projects." }),
  ).toBeVisible();
});
