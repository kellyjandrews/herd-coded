import { isCopilotLogin } from "@/lib/server/feature-state";
import {
  GitHubError,
  type GitHubRepository,
  getFactoryRepository,
  githubGraphql,
  githubRequest,
  githubToken,
  repositoryFileExists,
  usingMocks,
} from "@/lib/server/github";
import {
  mockApproveFeatures,
  mockGetProject,
  mockMergePullRequest,
  mockQueue,
  mockRejectFeature,
  mockRetryQueue,
  mockSetPaused,
  mockSubmitFeatures,
} from "@/lib/server/mock-data";
import type { FeatureIssue, QueueStatus } from "@/lib/server/types";

export const queueWorkflowPath = ".github/workflows/feature-queue.yml";
const pausedVariable = "FEATURE_QUEUE_PAUSED";
const copilotInstructions =
  "Implement only this issue, write all user-facing text in US English unless the issue says otherwise, run npm run verify and npm run build, and open a pull request that closes it.";

interface GitHubIssue {
  number: number;
  title: string;
  html_url: string;
  state?: string;
  pull_request?: unknown;
  labels?: Array<{ name: string }>;
  assignees?: Array<{ login: string }>;
}

function requireMockRepo(repository: string): void {
  if (!mockGetProject(repository)) throw new Error("Unknown factory repository.");
}

const hasLabel = (issue: GitHubIssue, name: string) =>
  (issue.labels ?? []).some((label) => label.name === name);

function awaitingApproval(issue: GitHubIssue): boolean {
  return (
    issue.state !== "closed" &&
    !issue.pull_request &&
    hasLabel(issue, "feature") &&
    !hasLabel(issue, "feature-queue") &&
    !(issue.assignees ?? []).some((assignee) => isCopilotLogin(assignee.login))
  );
}

async function listQueuedIssues(repo: GitHubRepository, token: string): Promise<GitHubIssue[]> {
  const issues = await githubRequest<GitHubIssue[]>(
    `/repos/${repo.full_name}/issues?state=open&labels=feature-queue&sort=created&direction=asc&per_page=100`,
    token,
  );
  return issues.filter((issue) => !issue.pull_request);
}

async function listPendingIssues(repo: GitHubRepository, token: string): Promise<GitHubIssue[]> {
  const issues = await githubRequest<GitHubIssue[]>(
    `/repos/${repo.full_name}/issues?state=open&labels=feature&sort=created&direction=asc&per_page=100`,
    token,
  );
  return issues.filter(awaitingApproval);
}

export async function dispatchQueue(repo: GitHubRepository, token: string): Promise<void> {
  await githubRequest(
    `/repos/${repo.full_name}/actions/workflows/feature-queue.yml/dispatches`,
    token,
    { method: "POST", body: JSON.stringify({ ref: repo.default_branch }) },
  );
}

// New features wait for approval on the project page before Copilot sees them.
export async function submitFeature(
  repository: string,
  title: string,
  body: string,
): Promise<FeatureIssue> {
  if (usingMocks()) {
    requireMockRepo(repository);
    return mockSubmitFeatures(repository, [title]);
  }
  const token = githubToken();
  const repo = await getFactoryRepository(repository, token);
  const issue = await githubRequest<GitHubIssue>(`/repos/${repo.full_name}/issues`, token, {
    method: "POST",
    body: JSON.stringify({ title, body, labels: ["feature"] }),
  });
  return { number: issue.number, url: issue.html_url };
}

async function requirePending(
  repo: GitHubRepository,
  number: number,
  token: string,
): Promise<GitHubIssue> {
  const issue = await githubRequest<GitHubIssue>(
    `/repos/${repo.full_name}/issues/${number}`,
    token,
  );
  if (!awaitingApproval(issue)) throw new Error(`Issue #${number} isn't awaiting approval.`);
  return issue;
}

export async function approveFeatures(repository: string, numbers: number[]): Promise<void> {
  if (usingMocks()) {
    requireMockRepo(repository);
    mockApproveFeatures(repository, numbers);
    return;
  }
  const token = githubToken();
  const repo = await getFactoryRepository(repository, token);
  const queueEnabled = await repositoryFileExists(repo.full_name, queueWorkflowPath, token);
  for (const number of numbers) await requirePending(repo, number, token);
  for (const number of [...numbers].sort((a, b) => a - b)) {
    // Labeling with a PAT fires the app's Feature queue workflow.
    if (queueEnabled) {
      await githubRequest(`/repos/${repo.full_name}/issues/${number}/labels`, token, {
        method: "POST",
        body: JSON.stringify({ labels: ["feature-queue"] }),
      });
    } else {
      await githubRequest(`/repos/${repo.full_name}/issues/${number}/assignees`, token, {
        method: "POST",
        body: JSON.stringify({
          assignees: ["copilot-swe-agent[bot]"],
          agent_assignment: {
            target_repo: repo.full_name,
            base_branch: repo.default_branch,
            custom_instructions: copilotInstructions,
          },
        }),
      });
    }
  }
}

export async function rejectFeature(repository: string, number: number): Promise<void> {
  if (usingMocks()) {
    requireMockRepo(repository);
    mockRejectFeature(repository, number);
    return;
  }
  const token = githubToken();
  const repo = await getFactoryRepository(repository, token);
  await requirePending(repo, number, token);
  await githubRequest(`/repos/${repo.full_name}/issues/${number}`, token, {
    method: "PATCH",
    body: JSON.stringify({ state: "closed", state_reason: "not_planned" }),
  });
}

export function parseCsvTitles(csv: string): string[] {
  const [header = "", ...rows] = csv.split(/\r?\n/).filter((line) => line.trim());
  const titleIndex = header
    .split(",")
    .map((name) => name.trim().replace(/^"|"$/g, "").toLowerCase())
    .indexOf("title");
  return rows
    .map((row) => (row.split(",")[titleIndex] ?? "").trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

export async function submitFeatureBatch(
  repository: string,
  fileName: string,
  csv: string,
): Promise<FeatureIssue> {
  if (usingMocks()) {
    requireMockRepo(repository);
    return mockSubmitFeatures(repository, parseCsvTitles(csv));
  }
  const token = githubToken();
  const repo = await getFactoryRepository(repository, token);
  if (!(await repositoryFileExists(repo.full_name, queueWorkflowPath, token))) {
    throw new Error("This project has no Feature queue workflow. Run Repair on the project first.");
  }
  // The repo's Feature queue workflow parses this block, creates the issues, and assigns Copilot.
  const issue = await githubRequest<GitHubIssue>(`/repos/${repo.full_name}/issues`, token, {
    method: "POST",
    body: JSON.stringify({
      title: `[Feature batch]: ${fileName}`,
      body: `\`\`\`csv\n${csv.trimEnd()}\n\`\`\`\n`,
      labels: ["feature-batch"],
    }),
  });
  return { number: issue.number, url: issue.html_url };
}

async function readPaused(repo: GitHubRepository, token: string): Promise<boolean> {
  try {
    const variable = await githubRequest<{ value: string }>(
      `/repos/${repo.full_name}/actions/variables/${pausedVariable}`,
      token,
    );
    return variable.value === "true";
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return false;
    throw error;
  }
}

export async function getQueueStatus(repository: string): Promise<QueueStatus> {
  if (usingMocks()) return mockQueue(repository);
  const token = githubToken();
  const repo = await getFactoryRepository(repository, token);
  const [enabled, paused, issues, pending] = await Promise.all([
    repositoryFileExists(repo.full_name, queueWorkflowPath, token),
    readPaused(repo, token),
    listQueuedIssues(repo, token),
    listPendingIssues(repo, token),
  ]);
  return {
    enabled,
    paused,
    pending: pending.map((issue) => ({
      number: issue.number,
      title: issue.title,
      url: issue.html_url,
    })),
    items: issues.map((issue, index) => ({
      number: issue.number,
      title: issue.title,
      url: issue.html_url,
      position: index + 1,
      assignedToCopilot: (issue.assignees ?? []).some((assignee) => isCopilotLogin(assignee.login)),
    })),
  };
}

export async function setQueuePaused(repository: string, paused: boolean): Promise<void> {
  if (usingMocks()) {
    requireMockRepo(repository);
    mockSetPaused(repository, paused);
    return;
  }
  const token = githubToken();
  const repo = await getFactoryRepository(repository, token);
  const value = JSON.stringify({ name: pausedVariable, value: String(paused) });
  try {
    await githubRequest(`/repos/${repo.full_name}/actions/variables/${pausedVariable}`, token, {
      method: "PATCH",
      body: value,
    });
  } catch (error) {
    if (!(error instanceof GitHubError && error.status === 404)) throw error;
    await githubRequest(`/repos/${repo.full_name}/actions/variables`, token, {
      method: "POST",
      body: value,
    });
  }
  if (!paused) await dispatchQueue(repo, token);
}

export async function retryQueue(repository: string): Promise<void> {
  if (usingMocks()) {
    requireMockRepo(repository);
    mockRetryQueue(repository);
    return;
  }
  const token = githubToken();
  await dispatchQueue(await getFactoryRepository(repository, token), token);
}

interface GitHubPull {
  number: number;
  state: string;
  draft: boolean;
  node_id: string;
  head: { ref: string; sha: string };
}

// Merges now if CI passed on the head commit; otherwise the app's ship job runs CI and merges.
export async function mergeFeaturePullRequest(
  repository: string,
  number: number,
): Promise<{ merged: boolean }> {
  if (usingMocks()) {
    requireMockRepo(repository);
    return { merged: mockMergePullRequest(repository, number) };
  }
  const token = githubToken();
  const repo = await getFactoryRepository(repository, token);
  const base = `/repos/${repo.full_name}`;
  const pr = await githubRequest<GitHubPull>(`${base}/pulls/${number}`, token);
  if (pr.state !== "open") throw new Error(`PR #${number} isn't open.`);
  if (pr.draft) {
    await githubGraphql(
      "mutation($id: ID!) { markPullRequestReadyForReview(input: { pullRequestId: $id }) { clientMutationId } }",
      { id: pr.node_id },
      token,
    );
  }
  const { workflow_runs: runs } = await githubRequest<{
    workflow_runs: Array<{ conclusion: string | null }>;
  }>(`${base}/actions/workflows/ci.yml/runs?head_sha=${pr.head.sha}&per_page=50`, token).catch(
    () => ({ workflow_runs: [] }),
  );
  if (!runs.some((run) => run.conclusion === "success")) {
    await dispatchQueue(repo, token);
    return { merged: false };
  }
  await githubRequest(`${base}/pulls/${number}/merge`, token, {
    method: "PUT",
    body: JSON.stringify({ merge_method: "squash", sha: pr.head.sha }),
  });
  await githubRequest(`${base}/git/refs/heads/${pr.head.ref}`, token, {
    method: "DELETE",
  }).catch(() => undefined);
  return { merged: true };
}
