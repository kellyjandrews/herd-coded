import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appTemplateFiles } from "@/lib/server/app-template";

type Routes = Record<string, unknown>;

const pr = {
  number: 2,
  title: "Add feature",
  draft: true,
  node_id: "PR_1",
  user: { login: "Copilot" },
  head: { ref: "copilot/add-feature", sha: "abc1234def" },
  base: { ref: "main" },
};

// Runs `feature-queue.mjs ship` with fetch stubbed; returns the mutating calls it made.
function ship(routes: Routes, env: Record<string, string> = {}): string[] {
  const dir = mkdtempSync(join(tmpdir(), "ship-"));
  const script = join(dir, "feature-queue.mjs");
  const stub = join(dir, "stub.mjs");
  writeFileSync(script, appTemplateFiles[".github/scripts/feature-queue.mjs"] ?? "");
  writeFileSync(
    stub,
    `const routes = ${JSON.stringify(routes)};
globalThis.fetch = async (url, init = {}) => {
  const path = url.replace("https://api.github.com", "");
  const method = init.method ?? "GET";
  if (method !== "GET") console.log("CALL " + method + " " + path);
  const body = routes[method + " " + path.split("?")[0]] ?? routes[path.split("?")[0]] ?? {};
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
};`,
  );
  const output = execFileSync(process.execPath, ["--import", stub, script, "ship"], {
    env: { ...process.env, GH_TOKEN: "test", REPO: "o/app", ...env },
    encoding: "utf8",
  });
  return output
    .split("\n")
    .filter((line) => line.startsWith("CALL "))
    .map((line) => line.slice(5));
}

const finished = [{ event: "copilot_work_started" }, { event: "copilot_work_finished" }];

describe("feature queue ship", () => {
  it("marks a finished draft ready and dispatches CI when only gated runs exist", () => {
    const calls = ship({
      "/repos/o/app/pulls": [pr],
      "/repos/o/app/issues/2/timeline": finished,
      "/repos/o/app/actions/workflows/ci.yml/runs": {
        workflow_runs: [{ status: "completed", conclusion: "action_required" }],
      },
    });
    expect(calls).toEqual([
      "POST /graphql",
      "POST /repos/o/app/actions/workflows/ci.yml/dispatches",
    ]);
  });

  it("squash-merges and deletes the branch when CI passed", () => {
    const calls = ship({
      "/repos/o/app/pulls": [{ ...pr, draft: false }],
      "/repos/o/app/issues/2/timeline": finished,
      "/repos/o/app/actions/workflows/ci.yml/runs": {
        workflow_runs: [{ status: "completed", conclusion: "success" }],
      },
    });
    expect(calls).toEqual([
      "PUT /repos/o/app/pulls/2/merge",
      "DELETE /repos/o/app/git/refs/heads/copilot/add-feature",
    ]);
  });

  it("asks Copilot to fix a failed CI run once", () => {
    const routes = {
      "/repos/o/app/pulls": [{ ...pr, draft: false }],
      "/repos/o/app/issues/2/timeline": finished,
      "/repos/o/app/actions/workflows/ci.yml/runs": {
        workflow_runs: [
          {
            status: "completed",
            conclusion: "failure",
            html_url: "https://x/run",
          },
        ],
      },
    };
    expect(ship({ ...routes, "/repos/o/app/issues/2/comments": [] })).toEqual([
      "POST /repos/o/app/issues/2/comments",
    ]);
    const asked = [{ body: "@copilot fix <!-- factory-ci-fix abc1234def -->" }];
    expect(ship({ ...routes, "GET /repos/o/app/issues/2/comments": asked })).toEqual([]);
  });

  it("leaves Copilot alone while it is working and honors FEATURE_AUTO_MERGE=false", () => {
    const routes = {
      "/repos/o/app/pulls": [pr],
      "/repos/o/app/issues/2/timeline": [{ event: "copilot_work_started" }],
    };
    expect(ship(routes)).toEqual([]);
    expect(
      ship({ ...routes, "/repos/o/app/issues/2/timeline": finished }, { AUTO_MERGE: "false" }),
    ).toEqual([]);
  });
});
