import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  describeApp,
  fallbackDescription,
  mvpIssueBody,
  mvpTitle,
  startMvp,
} from "@/lib/server/app-prompt";
import { mockGetProject, mockQueue, resetMockStore } from "@/lib/server/mock-data";

const prompt =
  "A recipe box where I can save recipes from a URL. It should also plan meals for the week.";

function stubModels(response: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const completion = (content: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
  });

describe("describeApp", () => {
  beforeEach(() => {
    vi.stubEnv("USE_MOCKS", "");
    vi.stubEnv("FACTORY_GITHUB_TOKEN", "gh-token");
    vi.stubEnv("FACTORY_MODELS_TOKEN", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the GitHub Models reply as a single-line description", async () => {
    const fetchMock = stubModels(completion('"Save recipes,\nplan meals."'));
    expect(await describeApp(prompt)).toBe("Save recipes, plan meals.");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://models.github.ai/inference/chat/completions");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer gh-token");
  });

  it("prefers FACTORY_MODELS_TOKEN", async () => {
    vi.stubEnv("FACTORY_MODELS_TOKEN", "models-token");
    const fetchMock = stubModels(completion("Recipes."));
    await describeApp(prompt);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer models-token");
  });

  it("caps descriptions at 350 characters", async () => {
    stubModels(completion("x".repeat(500)));
    const description = await describeApp(prompt);
    expect(description).toHaveLength(350);
    expect(description.endsWith("…")).toBe(true);
  });

  it.each([
    ["an error status", new Response("{}", { status: 401 })],
    ["a network error", new Error("offline")],
    ["an empty reply", completion("  ")],
  ])("falls back to the first sentence on %s", async (_label, response) => {
    stubModels(response);
    expect(await describeApp(prompt)).toBe("A recipe box where I can save recipes from a URL.");
  });

  it("skips the model in mock mode", async () => {
    vi.stubEnv("USE_MOCKS", "true");
    const fetchMock = stubModels(completion("unused"));
    expect(await describeApp(prompt)).toBe(fallbackDescription(prompt));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("startMvp", () => {
  const repository = "demo-factory/pet-sitter";

  beforeEach(() => {
    vi.stubEnv("USE_MOCKS", "true");
    resetMockStore();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("files and queues the MVP issue for a ready project", async () => {
    const project = mockGetProject(repository);
    if (!project) throw new Error("missing seed project");
    const mvp = await startMvp({ ...project, repairSteps: [] }, prompt);
    expect(mvp).toMatchObject({ number: 1, queued: true });
    const queue = mockQueue(repository);
    expect(queue.items).toMatchObject([{ number: 1, title: mvpTitle }]);
    expect(queue.pending).toEqual([]);
  });

  it("leaves the MVP awaiting approval when the project needs repair", async () => {
    const project = mockGetProject(repository);
    if (!project) throw new Error("missing seed project");
    const mvp = await startMvp({ ...project, repairSteps: ["secret"] }, prompt);
    expect(mvp.queued).toBe(false);
    expect(mockQueue(repository).pending).toMatchObject([{ number: 1, title: mvpTitle }]);
  });

  it("puts the prompt in the issue body", () => {
    expect(mvpIssueBody(`  ${prompt}\n`)).toContain(`## What the app should do\n\n${prompt}\n`);
  });
});
