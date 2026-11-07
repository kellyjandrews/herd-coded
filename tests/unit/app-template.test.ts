import { describe, expect, it } from "vitest";
import { appTemplateFiles } from "@/lib/server/app-template";

describe("generated app template", () => {
  it("has parseable JSON files", () => {
    for (const [path, content] of Object.entries(appTemplateFiles)) {
      if (path.endsWith(".json")) expect(() => JSON.parse(content), path).not.toThrow();
    }
  });

  it("includes the files the factory and Copilot depend on", () => {
    for (const path of [
      "package.json",
      "app/page.tsx",
      "app/api/health/route.ts",
      "vitest.config.ts",
      "playwright.config.ts",
      "tests/unit/health.test.ts",
      "tests/e2e/smoke.spec.ts",
      ".github/copilot-instructions.md",
      ".github/workflows/ci.yml",
      ".github/workflows/feature-queue.yml",
      ".github/scripts/feature-queue.mjs",
    ]) {
      expect(appTemplateFiles[path], path).toBeTruthy();
    }
  });

  it("runs tests in verify and exposes e2e", () => {
    const pkg = JSON.parse(appTemplateFiles["package.json"] ?? "{}") as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.verify).toContain("npm run test");
    expect(pkg.scripts.test).toBe("vitest run");
    expect(pkg.scripts["test:e2e"]).toBe("playwright test");
  });

  it("honors the queue pause variable", () => {
    expect(appTemplateFiles[".github/workflows/feature-queue.yml"]).toContain(
      "vars.FEATURE_QUEUE_PAUSED",
    );
    expect(appTemplateFiles[".github/scripts/feature-queue.mjs"]).toContain(
      'process.env.PAUSED === "true"',
    );
  });

  it("ships finished Copilot PRs without checking out PR code", () => {
    const workflow = appTemplateFiles[".github/workflows/feature-queue.yml"] ?? "";
    expect(workflow).toContain("pull_request_target:");
    expect(workflow).toContain("workflows: [CI]");
    expect(workflow).toContain("feature-queue.mjs ship");
    expect(workflow).not.toContain("github.event.pull_request.head");
    expect(appTemplateFiles[".github/workflows/ci.yml"]).toContain("workflow_dispatch:");
  });
});
