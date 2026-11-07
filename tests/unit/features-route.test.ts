import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const provision = vi.hoisted(() => ({
  submitFeature: vi.fn(),
  submitFeatureBatch: vi.fn(),
}));

vi.mock("@/lib/server/feature-queue", () => provision);

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
    expect(provision.submitFeature).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid JSON", "{"],
    ["missing details", { repository: "acme/app", title: "Add login" }],
    ["blank title", { repository: "acme/app", title: "  ", details: "d" }],
    ["long details", { repository: "acme/app", title: "t", details: "x".repeat(60001) }],
    ["CSV without title header", { repository: "acme/app", csv: "name,body\na,b\n" }],
    ["CSV with code fence", { repository: "acme/app", csv: "title\n```\n" }],
  ])("rejects %s with 400", async (_label, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(provision.submitFeature).not.toHaveBeenCalled();
    expect(provision.submitFeatureBatch).not.toHaveBeenCalled();
  });

  it("queues a trimmed single feature and reports its position", async () => {
    provision.submitFeature.mockResolvedValue({
      number: 7,
      url: "u",
      queued: true,
      position: 2,
    });
    const response = await post({
      repository: "acme/app",
      title: " Login ",
      details: " Do it ",
    });
    expect(response.status).toBe(201);
    expect(provision.submitFeature).toHaveBeenCalledWith("acme/app", "Login", "Do it");
    expect(await response.json()).toEqual({
      issue: { number: 7, url: "u" },
      queued: true,
      position: 2,
    });
  });

  it("accepts long Markdown feature details up to 60,000 characters", async () => {
    provision.submitFeature.mockResolvedValue({ number: 12, url: "u", queued: true });
    const details = `# Feature\n\n${"x".repeat(60000 - 11)}`;
    const response = await post({ repository: "acme/app", title: "Long feature", details });
    expect(response.status).toBe(201);
    expect(provision.submitFeature).toHaveBeenCalledWith("acme/app", "Long feature", details);
  });

  it("queues a CSV batch", async () => {
    provision.submitFeatureBatch.mockResolvedValue({
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
    provision.submitFeature.mockRejectedValue(new Error("GitHub API 500: boom"));
    const response = await post({
      repository: "acme/app",
      title: "t",
      details: "d",
    });
    expect(response.status).toBe(502);
  });
});
