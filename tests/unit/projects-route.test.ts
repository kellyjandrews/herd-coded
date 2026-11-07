import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const provision = vi.hoisted(() => ({
  listFactoryProjects: vi.fn(),
  provisionProject: vi.fn(),
}));

vi.mock("@/lib/server/provision-project", () => ({
  ...provision,
  ProvisionProjectError: class ProvisionProjectError extends Error {},
}));

import { GET, POST } from "@/app/api/projects/route";

const url = "https://factory.example/api/projects";
const sameOrigin = {
  origin: "https://factory.example",
  "content-type": "application/json",
};
const post = (body: unknown, headers: Record<string, string> = sameOrigin) =>
  POST(
    new Request(url, {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe("/api/projects", () => {
  beforeEach(() => {
    vi.stubEnv("FACTORY_BASIC_AUTH_USERNAME", "");
    vi.stubEnv("FACTORY_BASIC_AUTH_PASSWORD", "");
    vi.stubEnv("FACTORY_GITHUB_OWNER", "acme");
    vi.stubEnv("FACTORY_GITHUB_TOKEN", "test-token");
    vi.stubEnv("VERCEL_ACCESS_TOKEN", "test-token");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("GET reports unconfigured providers without calling GitHub", async () => {
    vi.stubEnv("FACTORY_GITHUB_TOKEN", "");
    const response = await GET(new Request(url));
    expect(await response.json()).toMatchObject({
      configured: false,
      projects: [],
    });
    expect(provision.listFactoryProjects).not.toHaveBeenCalled();
  });

  it("GET returns the owner with projects", async () => {
    provision.listFactoryProjects.mockResolvedValue([]);
    const response = await GET(new Request(url));
    expect(await response.json()).toEqual({
      configured: true,
      mock: false,
      owner: "acme",
      projects: [],
    });
  });

  it("GET serves demo projects in mock mode without credentials", async () => {
    vi.stubEnv("USE_MOCKS", "true");
    vi.stubEnv("FACTORY_GITHUB_TOKEN", "");
    provision.listFactoryProjects.mockResolvedValue([{ name: "demo" }]);
    const response = await GET(new Request(url));
    expect(await response.json()).toMatchObject({
      configured: true,
      mock: true,
      owner: "demo-factory",
      projects: [{ name: "demo" }],
    });
  });

  it("requires Basic Auth when it is configured", async () => {
    vi.stubEnv("FACTORY_BASIC_AUTH_USERNAME", "admin");
    vi.stubEnv("FACTORY_BASIC_AUTH_PASSWORD", "s3cret");
    expect((await GET(new Request(url))).status).toBe(401);
    expect((await post({ name: "app", visibility: "private" })).status).toBe(401);
  });

  it.each([
    ["missing", { "content-type": "application/json" }],
    ["null", { ...sameOrigin, origin: "null" }],
    ["malformed", { ...sameOrigin, origin: "::bad" }],
    ["cross-site", { ...sameOrigin, "sec-fetch-site": "cross-site" }],
  ])("POST rejects %s origin with 403", async (_label, headers) => {
    const response = await post({ name: "app", visibility: "private" }, headers);
    expect(response.status).toBe(403);
    expect(provision.provisionProject).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid JSON", "{"],
    ["non-string name", { name: 42, visibility: "private" }],
    ["long description", { name: "app", description: "x".repeat(351), visibility: "private" }],
    ["bad visibility", { name: "app", visibility: "internal" }],
  ])("POST rejects %s with 400", async (_label, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(provision.provisionProject).not.toHaveBeenCalled();
  });

  it("POST provisions a valid project", async () => {
    provision.provisionProject.mockResolvedValue({ name: "app" });
    const response = await post({ name: "app", visibility: "public" });
    expect(response.status).toBe(201);
    expect(provision.provisionProject).toHaveBeenCalledWith({
      name: "app",
      description: undefined,
      visibility: "public",
    });
  });
});
