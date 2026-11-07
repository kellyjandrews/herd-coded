import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { provisionProject } from "@/lib/server/provision-project";

type Call = { method: string; url: string; body?: unknown };

function mockFetch(routes: Array<[RegExp, number, unknown?]>) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const method = init.method ?? "GET";
      calls.push({
        method,
        url,
        body: init.body ? JSON.parse(String(init.body)) : undefined,
      });
      const match = routes.find(([pattern]) => pattern.test(`${method} ${url}`));
      if (!match) throw new Error(`Unexpected request: ${method} ${url}`);
      const [, status, body] = match;
      return new Response(status === 204 ? null : JSON.stringify(body ?? {}), {
        status,
      });
    }),
  );
  return calls;
}

const repo = {
  id: 1,
  name: "app",
  full_name: "acme/app",
  html_url: "https://github.com/acme/app",
  default_branch: "main",
  clone_url: "https://github.com/acme/app.git",
  ssh_url: "git@github.com:acme/app.git",
  private: true,
  topics: ["factory-app"],
};

describe("provisionProject", () => {
  beforeEach(() => {
    vi.stubEnv("USE_MOCKS", "");
    vi.stubEnv("FACTORY_GITHUB_OWNER", "acme");
    vi.stubEnv("FACTORY_GITHUB_TOKEN", "gh-token");
    vi.stubEnv("VERCEL_ACCESS_TOKEN", "vc-token");
    vi.stubEnv("VERCEL_TEAM_ID", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("resumes a partial project: reuses repo and Vercel project, tolerates existing labels", async () => {
    const calls = mockFetch([
      [/GET .*\/user$/, 200, { login: "acme" }],
      [/POST .*\/user\/repos$/, 422, { message: "name already exists on this account" }],
      [/GET .*\/repos\/acme\/app$/, 200, repo],
      [/PUT .*\/topics$/, 200, {}],
      [/GET .*\/contents\/package\.json$/, 200, { content: "" }],
      [/POST .*\/labels$/, 422, { message: "already_exists" }],
      [
        /GET .*api\.vercel\.com\/v9\/projects\/app/,
        200,
        {
          id: "prj",
          name: "app",
          targets: { production: { alias: ["app-acme.vercel.app"] } },
        },
      ],
      [/GET .*\/actions\/secrets\/public-key$/, 200, { key_id: "k1", key: `${"A".repeat(43)}=` }],
      [/PUT .*\/actions\/secrets\/COPILOT_ASSIGN_TOKEN$/, 201, {}],
    ]);

    const project = await provisionProject({
      name: "app",
      visibility: "private",
    });

    expect(project).toMatchObject({
      repository: "acme/app",
      productionUrl: "https://app-acme.vercel.app",
      visibility: "private",
      repairSteps: [],
    });
    expect(calls.some((call) => call.url.includes("/git/trees"))).toBe(false);
    expect(calls.some((call) => call.url.includes("/v11/projects"))).toBe(false);
    const secret = calls.find((call) => call.url.endsWith("/COPILOT_ASSIGN_TOKEN"));
    expect(secret?.body).toMatchObject({
      key_id: "k1",
      encrypted_value: expect.any(String),
    });
    expect(JSON.stringify(secret?.body)).not.toContain("gh-token");
  });

  it("refuses to reuse a repository the factory didn't create", async () => {
    mockFetch([
      [/GET .*\/user$/, 200, { login: "acme" }],
      [/POST .*\/user\/repos$/, 422, { message: "name already exists" }],
      [/GET .*\/repos\/acme\/app$/, 200, { ...repo, topics: [] }],
    ]);
    await expect(provisionProject({ name: "app", visibility: "private" })).rejects.toThrow(
      /wasn't created by this factory/,
    );
  });
});
