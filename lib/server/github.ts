import type { FactoryProject } from "@/lib/server/types";

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  default_branch: string;
  clone_url: string;
  ssh_url: string;
  private: boolean;
  topics?: string[];
  created_at?: string;
}

const githubApi = "https://api.github.com";
const githubApiVersion = "2026-03-10";

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

export function providerCredentialsConfigured(): boolean {
  return Boolean(
    process.env.FACTORY_GITHUB_OWNER &&
      process.env.FACTORY_GITHUB_TOKEN &&
      process.env.VERCEL_ACCESS_TOKEN,
  );
}

export function usingMocks(): boolean {
  return process.env.USE_MOCKS === "true";
}

export function githubToken(): string {
  return requiredEnv("FACTORY_GITHUB_TOKEN");
}

export async function githubRequest<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${githubApi}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": githubApiVersion,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new GitHubError(
      `GitHub API ${response.status}: ${body?.message ?? response.statusText}`,
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function githubGraphql<T>(
  query: string,
  variables: Record<string, unknown>,
  token: string,
): Promise<T> {
  const body = await githubRequest<{ data?: T; errors?: Array<{ message: string }> }>(
    "/graphql",
    token,
    { method: "POST", body: JSON.stringify({ query, variables }) },
  );
  if (body.errors?.length || !body.data) {
    throw new Error(`GitHub GraphQL: ${body.errors?.[0]?.message ?? "empty response"}`);
  }
  return body.data;
}

export class UnknownRepositoryError extends Error {}

export function parseFactoryRepository(repository: string): { owner: string; name: string } {
  const owner = requiredEnv("FACTORY_GITHUB_OWNER");
  const [repoOwner, repoName, ...rest] = repository.split("/");
  if (
    !repoOwner ||
    !repoName ||
    rest.length > 0 ||
    repoOwner.toLowerCase() !== owner.toLowerCase() ||
    !/^[A-Za-z0-9._-]+$/.test(repoName)
  ) {
    throw new UnknownRepositoryError("Unknown factory repository.");
  }
  return { owner: repoOwner, name: repoName };
}

export async function getFactoryRepository(
  repository: string,
  token: string,
): Promise<GitHubRepository> {
  const { owner, name } = parseFactoryRepository(repository);
  let repo: GitHubRepository;
  try {
    repo = await githubRequest<GitHubRepository>(`/repos/${owner}/${name}`, token);
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) {
      throw new UnknownRepositoryError("Unknown factory repository.");
    }
    throw error;
  }
  if (!repo.topics?.includes("factory-app")) {
    throw new UnknownRepositoryError("Repository was not created by this factory.");
  }
  return repo;
}

export function toFactoryProject(repo: GitHubRepository, productionUrl?: string): FactoryProject {
  return {
    name: repo.name,
    repository: repo.full_name,
    repositoryUrl: repo.html_url,
    httpsCloneUrl: repo.clone_url,
    sshCloneUrl: repo.ssh_url,
    cloneCommand: `gh repo clone ${repo.full_name}`,
    productionUrl: productionUrl ?? `https://${repo.name}.vercel.app`,
    createdAt: repo.created_at,
    visibility: repo.private ? "private" : "public",
  };
}

export async function repositoryFileExists(
  fullName: string,
  path: string,
  token: string,
): Promise<boolean> {
  try {
    await githubRequest(`/repos/${fullName}/contents/${path}`, token);
    return true;
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return false;
    throw error;
  }
}
