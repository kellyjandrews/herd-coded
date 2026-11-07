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
