import { getQueueStatus } from "@/lib/server/feature-queue";
import {
  checkStatusFromRollup,
  deriveFeatureState,
  isCopilotLogin,
} from "@/lib/server/feature-state";
import {
  getFactoryRepository,
  githubGraphql,
  githubToken,
  toFactoryProject,
  UnknownRepositoryError,
  usingMocks,
} from "@/lib/server/github";
import { mockFeatures, mockGetProject, mockProduction, mockQueue } from "@/lib/server/mock-data";
import type { FeatureItem, ProductionStatus, ProjectActivity, Section } from "@/lib/server/types";
import { type DeploymentSummary, getDeploymentSummary } from "@/lib/server/vercel";

const featureQuery = `
query FactoryFeatures($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    issues(first: 50, labels: ["feature", "feature-queue"], orderBy: { field: CREATED_AT, direction: DESC }) {
      nodes {
        number
        title
        url
        state
        createdAt
        labels(first: 20) { nodes { name } }
        assignees(first: 10) { nodes { login } }
        closedByPullRequestsReferences(first: 5, includeClosedPrs: true) {
          nodes {
            number
            title
            url
            state
            isDraft
            commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
          }
        }
      }
    }
  }
}`;

interface FeatureQueryResult {
  repository: {
    issues: {
      nodes: Array<{
        number: number;
        title: string;
        url: string;
        state: "OPEN" | "CLOSED";
        createdAt: string;
        labels: { nodes: Array<{ name: string }> };
        assignees: { nodes: Array<{ login: string }> };
        closedByPullRequestsReferences: {
          nodes: Array<{
            number: number;
            title: string;
            url: string;
            state: "OPEN" | "CLOSED" | "MERGED";
            isDraft: boolean;
            commits: {
              nodes: Array<{
                commit: { statusCheckRollup: { state: string } | null };
              }>;
            };
          }>;
        };
      }>;
    };
  } | null;
}

export async function fetchFeatures(
  owner: string,
  name: string,
  previews: DeploymentSummary["previews"],
): Promise<FeatureItem[]> {
  const data = await githubGraphql<FeatureQueryResult>(
    featureQuery,
    { owner, name },
    githubToken(),
  );
  return (data.repository?.issues.nodes ?? []).map((issue) => {
    const pulls = issue.closedByPullRequestsReferences.nodes;
    const pr =
      pulls.find((pull) => pull.state === "OPEN") ??
      pulls.find((pull) => pull.state === "MERGED") ??
      pulls[0];
    return {
      number: issue.number,
      title: issue.title,
      url: issue.url,
      createdAt: issue.createdAt,
      state: deriveFeatureState(
        {
          state: issue.state,
          queued: issue.labels.nodes.some((label) => label.name === "feature-queue"),
          assignedToCopilot: issue.assignees.nodes.some((user) => isCopilotLogin(user.login)),
        },
        pr,
      ),
      pullRequest: pr && {
        number: pr.number,
        title: pr.title,
        url: pr.url,
        state: pr.state,
        isDraft: pr.isDraft,
        checks: checkStatusFromRollup(pr.commits.nodes[0]?.commit.statusCheckRollup?.state),
        preview: previews.get(pr.number),
      },
    };
  });
}

function settled<T>(result: PromiseSettledResult<T>): Section<T> {
  return result.status === "fulfilled"
    ? { ok: true, data: result.value }
    : {
        ok: false,
        error: result.reason instanceof Error ? result.reason.message : "Request failed.",
      };
}

export async function getProjectActivity(
  owner: string,
  name: string,
): Promise<ProjectActivity | null> {
  const repository = `${owner}/${name}`;
  if (usingMocks()) {
    const project = mockGetProject(repository);
    if (!project) return null;
    const production = mockProduction(repository);
    return {
      project,
      features: { ok: true, data: mockFeatures(repository) },
      production: production
        ? { ok: true, data: production }
        : { ok: false, error: "No production deployment yet." },
      queue: { ok: true, data: mockQueue(repository) },
    };
  }

  let repo: Awaited<ReturnType<typeof getFactoryRepository>>;
  try {
    repo = await getFactoryRepository(repository, githubToken());
  } catch (error) {
    if (error instanceof UnknownRepositoryError) return null;
    throw error;
  }

  const deployments = await getDeploymentSummary(repo.name).then(
    (summary) => ({ ok: true as const, summary }),
    (error: unknown) => ({
      ok: false as const,
      error: error instanceof Error ? error.message : "Vercel request failed.",
    }),
  );
  const previews = deployments.ok && deployments.summary ? deployments.summary.previews : new Map();
  const [features, queue] = await Promise.allSettled([
    fetchFeatures(owner, repo.name, previews),
    getQueueStatus(repository),
  ]);

  let production: Section<ProductionStatus>;
  if (!deployments.ok) production = { ok: false, error: deployments.error };
  else if (!deployments.summary) production = { ok: false, error: "No linked Vercel project." };
  else if (!deployments.summary.production)
    production = { ok: false, error: "No production deployment yet." };
  else production = { ok: true, data: deployments.summary.production };

  return {
    project: toFactoryProject(repo, production.ok ? production.data.url : undefined),
    features: settled(features),
    production,
    queue: settled(queue),
  };
}
