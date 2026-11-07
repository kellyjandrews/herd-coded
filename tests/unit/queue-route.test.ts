import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/projects/[owner]/[repo]/queue/route";
import { resetMockStore } from "@/lib/server/mock-data";

const url = "https://factory.example/api/projects/demo-factory/recipe-box/queue";
const context = (repo = "recipe-box") => ({
  params: Promise.resolve({ owner: "demo-factory", repo }),
});
const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request(url, {
      method: "POST",
      headers: { origin: "https://factory.example", ...headers },
      body: JSON.stringify(body),
    }),
    context(),
  );

describe("/api/projects/[owner]/[repo]/queue (mock mode)", () => {
  beforeEach(() => {
    vi.stubEnv("USE_MOCKS", "true");
    vi.stubEnv("FACTORY_BASIC_AUTH_USERNAME", "");
    vi.stubEnv("FACTORY_BASIC_AUTH_PASSWORD", "");
    resetMockStore();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns the ordered queue", async () => {
    const response = await GET(new Request(url), context());
    const { queue } = await response.json();
    expect(queue.items.map((item: { position: number }) => item.position)).toEqual([1, 2, 3]);
    expect(queue.items[0].assignedToCopilot).toBe(true);
  });

  it("pauses and resumes", async () => {
    expect((await (await post({ action: "pause" })).json()).queue.paused).toBe(true);
    expect((await (await post({ action: "resume" })).json()).queue.paused).toBe(false);
  });

  it("rejects unknown actions and cross-site requests", async () => {
    expect((await post({ action: "delete" })).status).toBe(400);
    expect((await post({ action: "pause" }, { "sec-fetch-site": "cross-site" })).status).toBe(403);
  });

  it("returns 404 for unknown projects", async () => {
    const response = await GET(new Request(url), context("missing"));
    expect(response.status).toBe(404);
  });
});
