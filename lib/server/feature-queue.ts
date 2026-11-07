import { isCopilotLogin } from "@/lib/server/feature-state";
import {
  GitHubError,
  type GitHubRepository,
  getFactoryRepository,
  githubRequest,
  githubToken,
  repositoryFileExists,
  usingMocks,
} from "@/lib/server/github";
import {
  mockGetProject,
  mockQueue,
  mockQueueFeature,
  mockRetryQueue,
  mockSetPaused,
} from "@/lib/server/mock-data";
import type { FeatureIssue, QueueStatus } from "@/lib/server/types";

export const queueWorkflowPath = ".github/workflows/feature-queue.yml";
const pausedVariable = "FEATURE_QUEUE_PAUSED";
const copilotInstructions =
  "Implement only this issue, write all user-facing text in US English unless the issue says otherwise, run npm run verify and npm run build, and open a pull request that closes it.";

export interface SubmittedFeature extends FeatureIssue {
  queued: boolean;
  position?: number;
}

interface GitHubIssue {
  number: number;
  title: string;
  html_url: string;
  pull_request?: unknown;
  assignees?: Array<{ login: string }>;
}

function requireMockRepo(repository: string): void {
  if (!mockGetProject(repository)) throw new Error("Unknown factory repository.");
}

async function listQueuedIssues(repo: GitHubRepository, token: string): Promise<GitHubIssue[]> {
  const issues = await githubRequest<GitHubIssue[]>(
    `/repos/${repo.full_name}/issues?state=open&labels=feature-queue&sort=created&direction=asc&per_page=100`,
    token,
  );
  return issues.filter((issue) => !issue.pull_request);
}

export async function dispatchQueue(repo: GitHubRepository, token: string): Promise<void> {
  await githubRequest(
    `/repos/${repo.full_name}/actions/workflows/feature-queue.yml/dispatches`,
    token,
    { method: "POST", body: JSON.stringify({ ref: repo.default_branch }) },
  );
}

export async function submitFeature(
  repository: string,
  title: string,
  body: string,
): Promise<SubmittedFeature> {
  if (usingMocks()) {
    requireMockRepo(repository);
    return { ...mockQueueFeature(repository, [title]), queued: true };
  }
  const token = githubToken();
  const repo = await getFactoryRepository(repository, token);

  if (await repositoryFileExists(repo.full_name, queueWorkflowPath, token)) {
    const issue = await githubRequest<GitHubIssue>(`/repos/${repo.full_name}/issues`, token, {
      method: "POST",
      body: JSON.stringify({ title, body, labels: ["feature", "feature-queue"] }),
    });
    await dispatchQueue(repo, token);
    const queued = await listQueuedIssues(repo, token);
    const index = queued.findIndex((item) => item.number === issue.number);
    return {
      number: issue.number,
      url: issue.html_url,
      queued: true,
      position: index >= 0 ? index + 1 : undefined,
    };
  }

  const issue = await githubRequest<GitHubIssue>(`/repos/${repo.full_name}/issues`, token, {
    method: "POST",
    body: JSON.stringify({
      title,
      body,
      labels: ["feature"],
      assignees: ["copilot-swe-agent[bot]"],
      agent_assignment: {
        target_repo: repo.full_name,
        base_branch: repo.default_branch,
        custom_instructions: copilotInstructions,
      },
    }),
  });
  return { number: issue.number, url: issue.html_url, queued: false };
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
    return mockQueueFeature(repository, parseCsvTitles(csv));
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
  const [enabled, paused, issues] = await Promise.all([
    repositoryFileExists(repo.full_name, queueWorkflowPath, token),
    readPaused(repo, token),
    listQueuedIssues(repo, token),
  ]);
  return {
    enabled,
    paused,
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
