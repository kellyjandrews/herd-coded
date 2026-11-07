import { requiredEnv } from "@/lib/server/github";
import type { DeploymentState, ProductionStatus } from "@/lib/server/types";

export class VercelError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "VercelError";
  }
}

export interface VercelProject {
  id: string;
  name: string;
  targets?: { production?: { alias?: string[]; url?: string } };
}

interface VercelDeployment {
  uid: string;
  url: string;
  state?: string;
  readyState?: string;
  target?: string | null;
  created?: number;
  createdAt?: number;
  inspectorUrl?: string;
  meta?: { githubPrId?: string; githubCommitSha?: string };
}

export async function vercelRequest<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = requiredEnv("VERCEL_ACCESS_TOKEN");
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  const separator = path.includes("?") ? "&" : "?";
  const query = teamId ? `${separator}teamId=${encodeURIComponent(teamId)}` : "";
  const response = await fetch(`https://api.vercel.com${path}${query}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new VercelError(
      error?.error?.message ?? `Vercel API ${response.status}: ${response.statusText}`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

export async function findVercelProject(name: string): Promise<VercelProject | null> {
  try {
    return await vercelRequest<VercelProject>(`/v9/projects/${encodeURIComponent(name)}`);
  } catch (error) {
    if (error instanceof VercelError && error.status === 404) return null;
    throw error;
  }
}

export function productionUrlFor(project: VercelProject): string | undefined {
  // Never guess <name>.vercel.app: it's global and may belong to another account.
  const production = project.targets?.production;
  const alias = (production?.alias ?? [])
    .filter((domain) => !domain.includes("-git-"))
    .sort((a, b) => a.length - b.length)[0];
  const host = alias ?? production?.url;
  return host ? `https://${host}` : undefined;
}

function toState(value: string | undefined): DeploymentState {
  const state = value?.toUpperCase();
  if (state === "INITIALIZING") return "BUILDING";
  if (
    state === "READY" ||
    state === "BUILDING" ||
    state === "QUEUED" ||
    state === "ERROR" ||
    state === "CANCELED"
  ) {
    return state;
  }
  return "UNKNOWN";
}

export interface DeploymentSummary {
  production?: ProductionStatus;
  previews: Map<number, { url: string; state: DeploymentState }>;
}

export function summarizeDeployments(
  project: VercelProject,
  deployments: VercelDeployment[],
): DeploymentSummary {
  const productionUrl = productionUrlFor(project);
  const previews = new Map<number, { url: string; state: DeploymentState }>();
  let production: ProductionStatus | undefined;

  for (const deployment of deployments) {
    const state = toState(deployment.state ?? deployment.readyState);
    const created = deployment.created ?? deployment.createdAt;
    if (deployment.target === "production") {
      production ??= {
        url: productionUrl ?? `https://${deployment.url}`,
        state,
        sha: deployment.meta?.githubCommitSha,
        createdAt: created ? new Date(created).toISOString() : undefined,
        inspectorUrl: deployment.inspectorUrl,
      };
      continue;
    }
    const pr = Number(deployment.meta?.githubPrId);
    if (pr && !previews.has(pr)) previews.set(pr, { url: `https://${deployment.url}`, state });
  }
  return { production, previews };
}

export async function getDeploymentSummary(name: string): Promise<DeploymentSummary | null> {
  const project = await findVercelProject(name);
  if (!project) return null;
  const { deployments } = await vercelRequest<{
    deployments: VercelDeployment[];
  }>(`/v6/deployments?projectId=${encodeURIComponent(project.id)}&limit=50`);
  return summarizeDeployments(project, deployments);
}
