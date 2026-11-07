import { defineConfig, devices } from "@playwright/test";

// BASE_URL set → test a deployed preview/production URL.
// BASE_URL unset → start a local dev server with mock providers on its own port.
const localPort = 3100;
const baseURL = process.env.BASE_URL ?? `http://localhost:${localPort}`;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const basicAuthUsername = process.env.FACTORY_BASIC_AUTH_USERNAME;
const basicAuthPassword = process.env.FACTORY_BASIC_AUTH_PASSWORD;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Lets CI through Vercel Deployment Protection on previews.
    extraHTTPHeaders: bypass
      ? {
          "x-vercel-protection-bypass": bypass,
          "x-vercel-set-bypass-cookie": "true",
        }
      : undefined,
    // Lets tests through the factory dashboard's Basic Auth.
    httpCredentials:
      basicAuthUsername && basicAuthPassword
        ? { username: basicAuthUsername, password: basicAuthPassword }
        : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Mock-data specs mutate a shared in-memory store, so run them once.
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testIgnore: /project-detail\.spec\.ts/,
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `npx next dev -p ${localPort}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        env: { USE_MOCKS: "true" },
      },
});
