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

  it("lists pending features and approves them into the queue", async () => {
    const { queue } = await (await GET(new Request(url), context())).json();
    expect(queue.pending.map((item: { number: number }) => item.number)).toEqual([6]);

    const approved = (await (await post({ action: "approve", issues: [6] })).json()).queue;
    expect(approved.pending).toEqual([]);
    expect(approved.items.at(-1)).toMatchObject({ number: 6, position: 4 });
  });

  it("rejects a pending feature", async () => {
    const { queue } = await (await post({ action: "reject", issue: 6 })).json();
    expect(queue.pending).toEqual([]);
    expect(queue.items.map((item: { number: number }) => item.number)).not.toContain(6);
  });

  it("refuses features that aren't awaiting approval and bad issue numbers", async () => {
    expect((await post({ action: "approve", issues: [4] })).status).toBe(409);
    expect((await post({ action: "reject", issue: 99 })).status).toBe(409);
    expect((await post({ action: "approve", issues: [] })).status).toBe(400);
    expect((await post({ action: "approve", issues: ["6"] })).status).toBe(400);
    expect((await post({ action: "reject", issue: -1 })).status).toBe(400);
  });

  it("merges a PR whose checks pass and defers one whose checks don't", async () => {
    const merged = await post({ action: "merge", pullRequest: 8 });
    expect((await merged.json()).merged).toBe(true);
    expect((await post({ action: "merge", pullRequest: 8 })).status).toBe(409);
    expect((await (await post({ action: "merge", pullRequest: 9 })).json()).merged).toBe(false);
    expect((await post({ action: "merge", pullRequest: "8" })).status).toBe(400);
  });

  it("returns 404 for unknown projects", async () => {
    const response = await GET(new Request(url), context("missing"));
    expect(response.status).toBe(404);
  });
});
