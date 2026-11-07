export const appTemplateFiles: Record<string, string> = {
  ".gitignore": `node_modules/\n.next/\nout/\n.vercel/\n.env\n.env.local\n.env.*.local\n*.tsbuildinfo\nplaywright-report/\ntest-results/\ncoverage/\n`,
  "package.json": JSON.stringify(
    {
      name: "new-app",
      version: "0.1.0",
      private: true,
      type: "module",
      engines: { node: ">=20" },
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "biome check .",
        typecheck: "tsc --noEmit",
        test: "vitest run",
        "test:e2e": "playwright test",
        verify: "npm run lint && npm run typecheck && npm run test",
      },
      dependencies: {
        next: "16.4.3",
        react: "19.2.0",
        "react-dom": "19.2.0",
      },
      devDependencies: {
        "@biomejs/biome": "2.6.4",
        "@playwright/test": "1.64.1",
        "@types/node": "22.0.0",
        "@types/react": "19.0.0",
        "@types/react-dom": "19.0.0",
        typescript: "5.6.3",
        vitest: "3.2.7",
      },
    },
    null,
    2,
  ),
  "next.config.ts": `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exposes the deployed commit so /api/health shows what is running.
  env: {
    NEXT_PUBLIC_GIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "local",
    NEXT_PUBLIC_DEPLOY_ENV: process.env.VERCEL_ENV || "development",
  },
};

export default nextConfig;
`,
  "vitest.config.ts": `import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
});
`,
  "playwright.config.ts": `import { defineConfig, devices } from "@playwright/test";

// Set BASE_URL to test a deployed preview; otherwise a local dev server starts.
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
`,
  "tests/unit/health.test.ts": `import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("reports ok with the deployed commit", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", sha: expect.any(String) });
  });
});
`,
  "tests/e2e/smoke.spec.ts": `import { expect, test } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("health endpoint is ok", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({ status: "ok" });
});
`,
  "tsconfig.json": JSON.stringify(
    {
      compilerOptions: {
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "react-jsx",
        incremental: true,
        plugins: [{ name: "next" }],
        paths: { "@/*": ["./*"] },
      },
      include: ["next-env.d.ts", ".next/types/**/*.ts", "**/*.ts", "**/*.tsx"],
      exclude: ["node_modules"],
    },
    null,
    2,
  ),
  "biome.json": `{
  "$schema": "https://biomejs.dev/schemas/2.6.4/schema.json",
  "files": {
    "includes": ["app/**", "tests/**", "*.ts", "*.tsx"]
  },
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "preset": "recommended"
    }
  }
}
`,
  "AGENTS.md": `# Next.js project guidance

This app uses Next.js 16. Read the relevant guide under node_modules/next/dist/docs before changing app-router or deployment code. Use Server Components by default and small Client Components only for interactivity. Run npm run verify and npm run build before opening a PR.
`,
  ".github/copilot-instructions.md": `# Project instructions

- Implement only the feature requested in the issue; do not infer extra product work.
- Write all user-facing text, seed data, and code comments in US English unless the issue explicitly asks for another language.
- Keep changes small, preserve app behavior, and use existing patterns.
- Run npm run verify and npm run build before opening a pull request.
- Never commit secrets, change production settings, or deploy directly.
- Use feat/<short-name> branches and open a pull request for review.
`,
  ".github/agents/feature-builder.agent.md": `---
name: Feature Builder
description: Implement an assigned feature issue, validate it, and open a pull request for review.
---

Read the assigned issue and relevant code first. Implement the requested behavior only. Add or update tests, run npm run verify and npm run build, then summarize the changes and open a pull request. Never deploy to production or add secrets.
`,
  ".github/ISSUE_TEMPLATE/feature.yml": `name: Feature request
description: Describe one small feature to be implemented by the remote coding agent.
title: "[Feature]: "
labels: [feature]
body:
  - type: textarea
    id: user-value
    attributes:
      label: What should the user be able to do?
      placeholder: "As a <user>, I can <action> so that <benefit>."
    validations:
      required: true
  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance criteria
      description: Include observable behavior and any edge cases.
      placeholder: "Given ..., when ..., then ..."
    validations:
      required: true
  - type: textarea
    id: constraints
    attributes:
      label: Constraints or out of scope
`,
  ".github/ISSUE_TEMPLATE/feature-batch.yml": `name: Feature batch (CSV)
description: Attach a CSV of features. Each row becomes a feature issue that awaits approval, then Copilot builds them one at a time.
title: "[Feature batch]: "
labels: [feature-batch]
body:
  - type: markdown
    attributes:
      value: |
        The first row must be a header using GitHub issue fields: title, body, labels.
        title is required. body is Markdown. labels is optional and comma-separated (quote the cell).
        Up to 50 rows per batch.
  - type: textarea
    id: csv
    attributes:
      label: CSV file
      description: Drag and drop a .csv file here.
    validations:
      required: true
`,
  ".github/workflows/feature-queue.yml": `name: Feature queue

on:
  issues:
    types: [opened, labeled, closed, assigned]
  # Runs started by Copilot need approval, so ship starts from PAT or Vercel events and polls.
  issue_comment:
    types: [created, edited]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  import:
    if: github.event_name == 'issues' && github.event.action != 'closed' && contains(github.event.issue.labels.*.name, 'feature-batch')
    runs-on: ubuntu-latest
    concurrency:
      group: feature-batch-\${{ github.event.issue.number }}
    steps:
      - uses: actions/checkout@v4
      - run: node .github/scripts/feature-queue.mjs import
        env:
          GH_TOKEN: \${{ secrets.COPILOT_ASSIGN_TOKEN }}
          REPO: \${{ github.repository }}
          ISSUE_NUMBER: \${{ github.event.issue.number }}

  next:
    needs: import
    if: >-
      always() && (needs.import.result == 'success' || github.event_name == 'workflow_dispatch' ||
      (github.event.action == 'labeled' && github.event.label.name == 'feature-queue') ||
      (github.event.action == 'closed' && contains(github.event.issue.labels.*.name, 'feature-queue')))
    runs-on: ubuntu-latest
    concurrency:
      group: feature-queue
    steps:
      - uses: actions/checkout@v4
      - run: node .github/scripts/feature-queue.mjs next
        env:
          GH_TOKEN: \${{ secrets.COPILOT_ASSIGN_TOKEN }}
          REPO: \${{ github.repository }}
          PAUSED: \${{ vars.FEATURE_QUEUE_PAUSED }}

  # Waits for Copilot, marks the PR ready, runs CI without approval, and merges on green.
  ship:
    if: >-
      github.event_name == 'workflow_dispatch' ||
      (github.event_name == 'issues' && github.event.action == 'assigned' && contains(github.event.assignee.login, 'copilot')) ||
      (github.event_name == 'issue_comment' && github.event.issue.pull_request && github.event.comment.user.login == 'vercel[bot]')
    runs-on: ubuntu-latest
    timeout-minutes: 30
    concurrency:
      group: feature-ship
    steps:
      # Default-branch code only; never check out the pull request.
      - uses: actions/checkout@v4
      - run: node .github/scripts/feature-queue.mjs ship
        env:
          GH_TOKEN: \${{ secrets.COPILOT_ASSIGN_TOKEN }}
          REPO: \${{ github.repository }}
          AUTO_MERGE: \${{ vars.FEATURE_AUTO_MERGE }}
          SHIP_WAIT_MINUTES: \${{ vars.SHIP_WAIT_MINUTES }}
`,
  ".github/scripts/feature-queue.mjs": `const api = "https://api.github.com";
const token = process.env.GH_TOKEN;
const repo = process.env.REPO;
const batchLabel = "feature-batch";
const queueLabel = "feature-queue";
const maxRows = 50;
const maxFixRequests = 3;
const isCopilot = (login) => (login ?? "").toLowerCase().includes("copilot");
const fixMarker = "<!-- factory-ci-fix";
const attachmentPrefix = "https://github.com/user-attachments/files/";
const fence = "\`\`\`";

if (!token) {
  console.error(
    "Add a COPILOT_ASSIGN_TOKEN repository secret: a fine-grained PAT with Issues, Pull requests, Contents, and Actions read/write.",
  );
  process.exit(1);
}

async function gh(path, init = {}) {
  const response = await fetch(api + path, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2026-03-10",
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const error = new Error(
      "GitHub API " + response.status + " " + path + ": " + (await response.text()),
    );
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

async function graphql(query, variables) {
  const result = await gh("/graphql", {
    method: "POST",
    body: JSON.stringify({ query, variables }),
  });
  if (result.errors) throw new Error("GitHub GraphQL: " + JSON.stringify(result.errors));
  return result.data;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\\n" || c === "\\r") {
      if (c === "\\r" && text[i + 1] === "\\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((value) => value.trim()));
}

async function readCsv(body) {
  const start = body.indexOf(attachmentPrefix);
  if (start >= 0) {
    let end = start;
    while (end < body.length && !" )>\\n\\r\\t".includes(body[end])) end++;
    const url = body.slice(start, end);
    if (url.toLowerCase().endsWith(".csv")) {
      // Token goes only to github.com; the signed storage redirect is fetched without it.
      const response = await fetch(url, {
        headers: { Authorization: "Bearer " + token },
        redirect: "manual",
      });
      const location = response.headers.get("location");
      const file = location ? await fetch(location) : response;
      if (file.ok && !(file.headers.get("content-type") ?? "").includes("text/html")) {
        return file.text();
      }
    }
  }
  // Fallback for private repos where the attachment can't be downloaded.
  const open = body.indexOf(fence + "csv");
  if (open >= 0) {
    const from = body.indexOf("\\n", open) + 1;
    const close = body.indexOf(fence, from);
    if (from > 0 && close > from) return body.slice(from, close);
  }
  return null;
}

async function fail(issueNumber, message) {
  await gh("/repos/" + repo + "/issues/" + issueNumber + "/comments", {
    method: "POST",
    body: JSON.stringify({ body: message }),
  });
  throw new Error(message);
}

async function importBatch() {
  const number = process.env.ISSUE_NUMBER;
  const issue = await gh("/repos/" + repo + "/issues/" + number);
  if (issue.state !== "open" || !issue.labels.some((label) => label.name === batchLabel)) return;

  const access = await gh("/repos/" + repo + "/collaborators/" + issue.user.login + "/permission");
  if (!["admin", "write"].includes(access.permission)) {
    await fail(number, "Only collaborators with write access can queue feature batches.");
  }

  const csv = await readCsv(issue.body ?? "");
  if (!csv) {
    await fail(
      number,
      "Could not read the CSV. Attach a .csv file, or paste the CSV in a csv code block, then remove and re-add the feature-batch label.",
    );
  }
  const rows = parseCsv(csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv);
  const header = (rows.shift() ?? []).map((name) => name.trim().toLowerCase());
  const column = (name) => header.indexOf(name);
  if (column("title") < 0) {
    await fail(number, "The first CSV row must be a header with title, body, and optional labels columns.");
  }
  if (rows.length > maxRows) {
    await fail(number, "Split the CSV into batches of " + maxRows + " rows or fewer.");
  }
  const cell = (row, name) => (column(name) >= 0 ? (row[column(name)] ?? "").trim() : "");

  const created = [];
  for (const row of rows) {
    const title = cell(row, "title").slice(0, 256);
    if (!title) continue;
    const body = cell(row, "body");
    const labels = cell(row, "labels")
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean);
    const featureIssue = await gh("/repos/" + repo + "/issues", {
      method: "POST",
      body: JSON.stringify({
        title,
        body: (body ? body + "\\n\\n" : "") + "Queued from #" + number + ".",
        labels: [...new Set(["feature", ...labels])],
      }),
    });
    created.push("- #" + featureIssue.number + " " + title);
  }

  await gh("/repos/" + repo + "/issues/" + number + "/comments", {
    method: "POST",
    body: JSON.stringify({
      body:
        "Created " +
        created.length +
        " feature issues. Approve them on the AI Code Factory project page (or add the feature-queue label) and Copilot builds them in order, one at a time.\\n\\n" +
        created.join("\\n"),
    }),
  });
  await gh("/repos/" + repo + "/issues/" + number, {
    method: "PATCH",
    body: JSON.stringify({ state: "closed", state_reason: "completed" }),
  });
}

async function startNext() {
  if (process.env.PAUSED === "true") {
    console.log("Feature queue is paused (FEATURE_QUEUE_PAUSED=true).");
    return;
  }
  const queued = (
    await gh(
      "/repos/" + repo + "/issues?state=open&labels=" + queueLabel + "&sort=created&direction=asc&per_page=100",
    )
  ).filter((issue) => !issue.pull_request);
  if (queued.some((issue) => issue.assignees.some((a) => a.login.toLowerCase().includes("copilot")))) {
    console.log("A queued feature is already assigned to Copilot.");
    return;
  }
  const next = queued[0];
  if (!next) {
    console.log("Feature queue is empty.");
    return;
  }
  const { default_branch } = await gh("/repos/" + repo);
  await gh("/repos/" + repo + "/issues/" + next.number + "/assignees", {
    method: "POST",
    body: JSON.stringify({
      assignees: ["copilot-swe-agent[bot]"],
      agent_assignment: {
        target_repo: repo,
        base_branch: default_branch,
        custom_instructions:
          "Implement only this issue, write all user-facing text in US English unless the issue says otherwise, run npm run verify and npm run build, and open a pull request that closes it.",
      },
    }),
  });
  console.log("Assigned #" + next.number + " to Copilot.");
}

async function copilotFinished(pr) {
  let latest = null;
  for (let page = 1; page <= 10; page++) {
    const events = await gh(
      "/repos/" + repo + "/issues/" + pr.number + "/timeline?per_page=100&page=" + page,
    );
    for (const item of events) {
      if (item.event?.startsWith("copilot_work_")) latest = item.event;
    }
    if (events.length < 100) break;
  }
  return latest ? latest === "copilot_work_finished" : !pr.title.toUpperCase().startsWith("[WIP]");
}

async function requestFix(pr, reason) {
  const comments = await gh("/repos/" + repo + "/issues/" + pr.number + "/comments?per_page=100");
  const requests = comments.filter((comment) => comment.body?.includes(fixMarker));
  if (requests.some((c) => c.body.includes(pr.head.sha))) return "working";
  if (requests.length >= maxFixRequests) {
    console.log("#" + pr.number + " needs a person: " + reason);
    return "done";
  }
  await gh("/repos/" + repo + "/issues/" + pr.number + "/comments", {
    method: "POST",
    body: JSON.stringify({
      body:
        "@copilot " +
        reason +
        " Fix it, run npm run verify and npm run build, and push.\\n\\n" +
        fixMarker +
        " " +
        pr.head.sha +
        " -->",
    }),
  });
  console.log("Asked Copilot to fix #" + pr.number + ".");
  return "working";
}

async function startCi(pr) {
  try {
    await gh("/repos/" + repo + "/actions/workflows/ci.yml/dispatches", {
      method: "POST",
      body: JSON.stringify({ ref: pr.head.ref }),
    });
    console.log("Started CI for #" + pr.number + ".");
  } catch (error) {
    if (error.status !== 422) throw error;
    // Branches cut before CI accepted workflow_dispatch get it from base.
    await gh("/repos/" + repo + "/pulls/" + pr.number + "/update-branch", {
      method: "PUT",
      body: JSON.stringify({ expected_head_sha: pr.head.sha }),
    });
    console.log("Updated #" + pr.number + " from " + pr.base.ref + " to run CI.");
  }
}

async function merge(pr) {
  try {
    await gh("/repos/" + repo + "/pulls/" + pr.number + "/merge", {
      method: "PUT",
      body: JSON.stringify({ merge_method: "squash", sha: pr.head.sha }),
    });
  } catch (error) {
    if (error.status === 405) {
      return requestFix(pr, "This pull request can't merge into " + pr.base.ref + "; merge " + pr.base.ref + " and resolve conflicts.");
    }
    if (error.status === 409) {
      console.log("#" + pr.number + " changed while merging; retrying.");
      return "waiting";
    }
    throw error;
  }
  await gh("/repos/" + repo + "/git/refs/heads/" + pr.head.ref, { method: "DELETE" }).catch(() => {});
  console.log("Merged #" + pr.number + "; Vercel deploys production.");
  return "done";
}

async function shipPull(pr) {
  if (!(await copilotFinished(pr))) {
    console.log("#" + pr.number + ": Copilot is still working.");
    return "working";
  }
  if (pr.draft) {
    await graphql(
      "mutation($id: ID!) { markPullRequestReadyForReview(input: { pullRequestId: $id }) { clientMutationId } }",
      { id: pr.node_id },
    );
    console.log("Marked #" + pr.number + " ready for review.");
  }
  // Runs started by Copilot may never start or report back without approval; only completed ones count.
  const { workflow_runs } = await gh(
    "/repos/" + repo + "/actions/workflows/ci.yml/runs?head_sha=" + pr.head.sha + "&per_page=50",
  );
  const runs = workflow_runs.filter((run) => run.conclusion !== "action_required");
  if (runs.some((run) => run.conclusion === "success")) return merge(pr);
  if (runs.some((run) => run.status !== "completed" && !isCopilot(run.actor?.login))) {
    console.log("#" + pr.number + ": waiting for CI.");
    return "waiting";
  }
  const failed = runs.find((run) => ["failure", "timed_out"].includes(run.conclusion));
  if (failed) {
    return requestFix(pr, "CI failed on " + pr.head.sha.slice(0, 7) + ": " + failed.html_url + ".");
  }
  await startCi(pr);
  return "waiting";
}

async function ship() {
  if (process.env.AUTO_MERGE === "false") {
    console.log("Auto-merge is off (FEATURE_AUTO_MERGE=false).");
    return;
  }
  const deadline = Date.now() + Number(process.env.SHIP_WAIT_MINUTES || 25) * 60_000;
  for (;;) {
    const pulls = await gh("/repos/" + repo + "/pulls?state=open&per_page=100");
    let pending = false;
    for (const pr of pulls.filter((p) => isCopilot(p.user.login))) {
      try {
        if ((await shipPull(pr)) !== "done") pending = true;
      } catch (error) {
        console.error("#" + pr.number + ": " + error.message);
      }
    }
    if (!pending || Date.now() >= deadline) return;
    await new Promise((resolve) => setTimeout(resolve, 30_000));
  }
}

const commands = { import: importBatch, next: startNext, ship };
const command = commands[process.argv[2]];
if (!command) {
  console.error("Usage: node feature-queue.mjs import|next|ship");
  process.exit(1);
}
await command();
`,
  ".github/workflows/copilot-setup-steps.yml": `name: Copilot Setup Steps

on:
  workflow_dispatch:
  push:
    paths:
      - .github/workflows/copilot-setup-steps.yml

jobs:
  copilot-setup-steps:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm install
`,
  ".github/workflows/ci.yml": `name: CI

on:
  pull_request:
  push:
    branches: [main]
  # The Feature queue dispatches CI on Copilot branches so runs skip approval.
  workflow_dispatch:

permissions:
  contents: read

jobs:
  verify:
    name: verify
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm install
      - run: npm run verify
      - run: npm run build
`,
  "app/layout.tsx": `import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "New app",
  description: "A new app built with the factory",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
  "app/globals.css": `:root {
  color-scheme: light;
  font-family: Georgia, "Times New Roman", serif;
  background: #f4f5ef;
  color: #172f28;
}

* {
  box-sizing: border-box;
}
body {
  margin: 0;
  min-height: 100vh;
}
main {
  max-width: 760px;
  margin: 0 auto;
  padding: 12vh 24px;
}
h1 {
  font-size: 48px;
  font-weight: 500;
}
p {
  color: #50665e;
  font:
    16px / 1.6 ui-sans-serif,
    system-ui,
    sans-serif;
}
`,
  "app/page.tsx": `export default function Home() {
  return (
    <main>
      <p>NEW PROJECT</p>
      <h1>Your app starts here.</h1>
      <p>
        Describe one feature in a GitHub issue, then assign it to Copilot to build remotely and open
        a pull request.
      </p>
    </main>
  );
}
`,
  "app/api/health/route.ts": `export function GET() {
  return Response.json({
    status: "ok",
    env: process.env.NEXT_PUBLIC_DEPLOY_ENV ?? "development",
    sha: process.env.NEXT_PUBLIC_GIT_SHA ?? "local",
  });
}
`,
  "README.md": `# New app

A Next.js app provisioned by AI Code Factory.

## Local development

\`npm install\`
\`npm run dev\`

## Tests

- \`npm run verify\` runs Biome, TypeScript, and Vitest (\`tests/unit/\`).
- \`npm run test:e2e\` runs Playwright (\`tests/e2e/\`); run \`npx playwright install chromium\` once first. Set \`BASE_URL\` to test a deployed preview.

## Feature workflow

1. Add a feature from the AI Code Factory dashboard, or open a Feature request issue. It waits for approval.
2. Approve it on the factory's project page (or add the \`feature-queue\` label). The Feature queue workflow assigns approved features to GitHub Copilot one at a time.
3. When Copilot finishes, the queue marks its pull request ready and runs CI (verify and build); Vercel posts a preview.
4. When CI passes, the queue squash-merges the pull request, Vercel deploys production, and the next queued feature starts. If CI fails or the branch conflicts, the queue asks Copilot to fix it (up to 3 times), then leaves it for you.

Set the \`FEATURE_AUTO_MERGE\` repository variable to \`false\` to review and merge pull requests yourself.

The factory copies a \`COPILOT_ASSIGN_TOKEN\` repository secret when it creates or repairs this repo; Copilot sessions bill to that token's owner. Pause the queue by setting the \`FEATURE_QUEUE_PAUSED\` repository variable to \`true\` (the dashboard does this for you).

Copilot coding agent must be enabled for the repository and your account must have an eligible Copilot plan. Vercel Hobby and GitHub usage limits apply.

## Feature batches from CSV

1. Open a **Feature batch (CSV)** issue and attach a CSV with a \`title,body,labels\` header (up to 50 rows). For private repos, paste the CSV in a \`csv\` code block if the attachment can't be read.
2. The Feature queue workflow creates one \`feature\` issue per row and closes the batch issue. The rows wait for approval like any other feature.
3. Once approved, Copilot builds them in order; each time a queued issue closes (its PR merges), the next one is assigned.

If Copilot's PR is closed without merging, unassign Copilot or close the issue, then press Retry on the project's dashboard page (or run the Feature queue workflow manually) to continue.
`,
};
