import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const provision = vi.hoisted(() => ({
  createCopilotFeatureIssue: vi.fn(),
  createFeatureBatchIssue: vi.fn(),
}));

vi.mock("@/lib/server/provision-project", () => provision);

import { POST } from "@/app/api/features/route";

const sameOrigin = {
  origin: "https://factory.example",
  "content-type": "application/json",
};
const post = (body: unknown, headers: Record<string, string> = sameOrigin) =>
  POST(
    new Request("https://factory.example/api/features", {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe("POST /api/features", () => {
  beforeEach(() => {
    vi.stubEnv("FACTORY_BASIC_AUTH_USERNAME", "");
    vi.stubEnv("FACTORY_BASIC_AUTH_PASSWORD", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it.each([
    ["missing", { "content-type": "application/json" }],
    ["null", { ...sameOrigin, origin: "null" }],
    ["malformed", { ...sameOrigin, origin: "::bad" }],
    ["cross-site", { ...sameOrigin, "sec-fetch-site": "cross-site" }],
  ])("rejects %s origin with 403", async (_label, headers) => {
    const response = await post({ repository: "acme/app", title: "t", details: "d" }, headers);
    expect(response.status).toBe(403);
    expect(provision.createCopilotFeatureIssue).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid JSON", "{"],
    ["missing details", { repository: "acme/app", title: "Add login" }],
    ["blank title", { repository: "acme/app", title: "  ", details: "d" }],
    ["long details", { repository: "acme/app", title: "t", details: "x".repeat(5001) }],
    ["CSV without title header", { repository: "acme/app", csv: "name,body\na,b\n" }],
    ["CSV with code fence", { repository: "acme/app", csv: "title\n```\n" }],
  ])("rejects %s with 400", async (_label, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(provision.createCopilotFeatureIssue).not.toHaveBeenCalled();
    expect(provision.createFeatureBatchIssue).not.toHaveBeenCalled();
  });

  it("creates a trimmed single feature issue", async () => {
    provision.createCopilotFeatureIssue.mockResolvedValue({
      number: 7,
      url: "u",
    });
    const response = await post({
      repository: "acme/app",
      title: " Login ",
      details: " Do it ",
    });
    expect(response.status).toBe(201);
    expect(provision.createCopilotFeatureIssue).toHaveBeenCalledWith("acme/app", "Login", "Do it");
  });

  it("queues a CSV batch", async () => {
    provision.createFeatureBatchIssue.mockResolvedValue({
      number: 8,
      url: "u",
    });
    const response = await post({
      repository: "acme/app",
      fileName: "f.csv",
      csv: "title\nA\n",
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      batch: true,
      issue: { number: 8 },
    });
  });

  it("reports provider failures as 502", async () => {
    provision.createCopilotFeatureIssue.mockRejectedValue(new Error("GitHub API 500: boom"));
    const response = await post({
      repository: "acme/app",
      title: "t",
      details: "d",
    });
    expect(response.status).toBe(502);
  });
});
