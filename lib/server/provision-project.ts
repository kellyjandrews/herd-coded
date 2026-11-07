import { appTemplateFiles } from "@/lib/server/app-template";

interface GitHubRepository {
  id: number;
  full_name: string;
  html_url: string;
  default_branch: string;
  clone_url: string;
  ssh_url: string;
}

interface GitHubUser {
  login: string;
}

interface GitHubReference {
  object: { sha: string };
}

interface GitHubCommit {
  tree: { sha: string };
}

interface GitHubTree {
  sha: string;
}

interface GitHubCreatedCommit {
  sha: string;
}

export interface FactoryProject {
  name: string;
  repository: string;
  repositoryUrl: string;
  httpsCloneUrl: string;
  sshCloneUrl: string;
  cloneCommand: string;
  productionUrl: string;
  createdAt?: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  visibility: "private" | "public";
}

export class ProvisionProjectError extends Error {
  partialProject?: FactoryProject;

  constructor(message: string, partialProject?: FactoryProject) {
    super(message);
    this.name = "ProvisionProjectError";
    this.partialProject = partialProject;
  }
}

const githubApi = "https://api.github.com";
const githubApiVersion = "2026-03-10";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

async function githubRequest<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
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
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(`GitHub API ${response.status}: ${body?.message ?? response.statusText}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function createRepository(
  owner: string,
  token: string,
  input: CreateProjectInput,
): Promise<GitHubRepository> {
  const user = await githubRequest<GitHubUser>("/user", token);
  const isPersonal = user.login.toLowerCase() === owner.toLowerCase();
  const endpoint = isPersonal ? "/user/repos" : `/orgs/${encodeURIComponent(owner)}/repos`;
  return githubRequest<GitHubRepository>(endpoint, token, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      description: input.description?.trim() || "App created by AI Code Factory",
      private: input.visibility === "private",
      auto_init: true,
      has_issues: true,
      has_wiki: false,
    }),
  });
}

async function pushTemplate(repository: GitHubRepository, token: string): Promise<void> {
  const base = `/repos/${repository.full_name}`;
  const reference = await githubRequest<GitHubReference>(
    `${base}/git/ref/heads/${encodeURIComponent(repository.default_branch)}`,
    token,
  );
  const parentCommit = await githubRequest<GitHubCommit>(
    `${base}/git/commits/${reference.object.sha}`,
    token,
  );
  const tree = await githubRequest<GitHubTree>(`${base}/git/trees`, token, {
    method: "POST",
    body: JSON.stringify({
      base_tree: parentCommit.tree.sha,
      tree: Object.entries(appTemplateFiles).map(([path, content]) => ({
        path,
        mode: "100644",
        type: "blob",
        content,
      })),
    }),
  });
  const commit = await githubRequest<GitHubCreatedCommit>(`${base}/git/commits`, token, {
    method: "POST",
    body: JSON.stringify({
      message: "chore: scaffold app from AI Code Factory",
      tree: tree.sha,
      parents: [reference.object.sha],
    }),
  });
  await githubRequest(
    `${base}/git/refs/heads/${encodeURIComponent(repository.default_branch)}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    },
  );
  await githubRequest(`${base}/topics`, token, {
    method: "PUT",
    body: JSON.stringify({ names: ["ai-code-factory", "factory-app"] }),
  });
  // Issue forms only apply labels that already exist.
  for (const label of [
    { name: "feature", color: "0052cc", description: "Feature to build" },
    {
      name: "feature-batch",
      color: "c084fc",
      description: "CSV of features to queue",
    },
    {
      name: "feature-queue",
      color: "0e8a16",
      description: "Queued for Copilot, one at a time",
    },
  ]) {
    await githubRequest(`${base}/labels`, token, {
      method: "POST",
      body: JSON.stringify(label),
    });
  }
}

async function vercelRequest<T>(path: string, token: string, body: unknown): Promise<T> {
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const response = await fetch(`https://api.vercel.com${path}${query}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(
      error?.error?.message ?? `Vercel API ${response.status}: ${response.statusText}`,
    );
  }
  return (await response.json()) as T;
}

async function createVercelProject(
  input: CreateProjectInput,
  repository: GitHubRepository,
  token: string,
): Promise<string> {
  const project = await vercelRequest<{ name?: string }>("/v11/projects", token, {
    name: input.name,
    framework: "nextjs",
    outputDirectory: null,
    gitRepository: { type: "github", repo: repository.full_name },
  });
  if (!project.name) throw new Error("Vercel created the project but returned no project name.");

  // The template commit landed before the project was linked, so Vercel won't build it on its own.
  await vercelRequest("/v13/deployments", token, {
    name: project.name,
    project: project.name,
    target: "production",
    gitSource: {
      type: "github",
      repoId: repository.id,
      ref: repository.default_branch,
    },
  });
  return `https://${project.name}.vercel.app`;
}

export interface FeatureIssue {
  number: number;
  url: string;
}

export async function createCopilotFeatureIssue(
  repository: string,
  title: string,
  body: string,
): Promise<FeatureIssue> {
  const owner = requiredEnv("FACTORY_GITHUB_OWNER");
  const token = requiredEnv("FACTORY_GITHUB_TOKEN");
  const [repoOwner, repoName] = repository.split("/");
  if (
    !repoOwner ||
    !repoName ||
    repoOwner.toLowerCase() !== owner.toLowerCase() ||
    !/^[A-Za-z0-9._-]+$/.test(repoName)
  ) {
    throw new Error("Unknown factory repository.");
  }
  const repo = await githubRequest<GitHubRepository & { topics?: string[] }>(
    `/repos/${repoOwner}/${repoName}`,
    token,
  );
  if (!repo.topics?.includes("factory-app")) {
    throw new Error("Repository was not created by this factory.");
  }
  const issue = await githubRequest<{ number: number; html_url: string }>(
    `/repos/${repo.full_name}/issues`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        title,
        body,
        labels: ["feature"],
        assignees: ["copilot-swe-agent[bot]"],
        agent_assignment: {
          target_repo: repo.full_name,
          base_branch: repo.default_branch,
          custom_instructions:
            "Implement only this issue, run npm run verify and npm run build, and open a pull request.",
        },
      }),
    },
  );
  return { number: issue.number, url: issue.html_url };
}

export async function listFactoryProjects(): Promise<FactoryProject[]> {
  const owner = requiredEnv("FACTORY_GITHUB_OWNER");
  const token = requiredEnv("FACTORY_GITHUB_TOKEN");
  const repositories = await githubRequest<
    Array<GitHubRepository & { topics?: string[]; created_at?: string }>
  >(
    "/user/repos?visibility=all&affiliation=owner,organization_member&sort=updated&per_page=100",
    token,
  );

  return repositories
    .filter(
      (repository) =>
        repository.topics?.includes("factory-app") &&
        repository.full_name.split("/")[0]?.toLowerCase() === owner.toLowerCase(),
    )
    .map((repository) => ({
      name: repository.full_name.split("/")[1] ?? repository.full_name,
      repository: repository.full_name,
      repositoryUrl: repository.html_url,
      httpsCloneUrl: repository.clone_url,
      sshCloneUrl: repository.ssh_url,
      cloneCommand: `gh repo clone ${repository.full_name}`,
      productionUrl: `https://${repository.full_name.split("/")[1]}.vercel.app`,
      createdAt: repository.created_at,
    }));
}

export async function provisionProject(input: CreateProjectInput): Promise<FactoryProject> {
  const name = input.name.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 100) {
    throw new Error("Use lowercase letters, numbers, and single dashes for the project name.");
  }
  if (input.visibility !== "private" && input.visibility !== "public") {
    throw new Error("Choose private or public repository visibility.");
  }

  const owner = requiredEnv("FACTORY_GITHUB_OWNER");
  const githubToken = requiredEnv("FACTORY_GITHUB_TOKEN");
  const vercelToken = requiredEnv("VERCEL_ACCESS_TOKEN");
  let repo: GitHubRepository | undefined;

  try {
    repo = await createRepository(owner, githubToken, { ...input, name });
    await pushTemplate(repo, githubToken);
    const productionUrl = await createVercelProject({ ...input, name }, repo, vercelToken);
    return {
      name,
      repository: repo.full_name,
      repositoryUrl: repo.html_url,
      httpsCloneUrl: repo.clone_url,
      sshCloneUrl: repo.ssh_url,
      cloneCommand: `gh repo clone ${repo.full_name}`,
      productionUrl,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    const partialProject = repo
      ? {
          name,
          repository: repo.full_name,
          repositoryUrl: repo.html_url,
          httpsCloneUrl: repo.clone_url,
          sshCloneUrl: repo.ssh_url,
          cloneCommand: `gh repo clone ${repo.full_name}`,
          productionUrl: `https://${name}.vercel.app`,
        }
      : undefined;
    throw new ProvisionProjectError(
      error instanceof Error ? error.message : "Project creation failed.",
      partialProject,
    );
  }
}
