import { expect, test } from "@playwright/test";

test("home page renders", async ({ page }) => {
  const response = await page.goto("/");
  expect(
    response?.status(),
    "Dashboard request failed. Check preview protection and factory Basic Auth configuration.",
  ).toBe(200);
  await expect(page.getByTestId("hero-title")).toBeVisible();
});

test("health endpoint is ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  expect(await res.json()).toMatchObject({ status: "ok" });
});

test("configured dashboard rejects unauthenticated requests", async ({ playwright, baseURL }) => {
  test.skip(
    !process.env.FACTORY_BASIC_AUTH_USERNAME || !process.env.FACTORY_BASIC_AUTH_PASSWORD,
    "Basic Auth credentials are not configured for this test run",
  );
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const context = await playwright.request.newContext({
    baseURL,
    httpCredentials: undefined,
    extraHTTPHeaders: bypass ? { "x-vercel-protection-bypass": bypass } : undefined,
  });
  try {
    const response = await context.get("/");
    expect(response.status()).toBe(401);
    expect(response.headers()["www-authenticate"]).toMatch(/^Basic /);
  } finally {
    await context.dispose();
  }
});
