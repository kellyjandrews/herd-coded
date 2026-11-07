import { appTemplateFiles } from "@/lib/server/app-template";
import {
  GitHubError,
  type GitHubRepository,
  getFactoryRepository,
  githubRequest,
  githubToken,
  repositoryFileExists,
  requiredEnv,
  toFactoryProject,
  usingMocks,
} from "@/lib/server/github";
import { mockCreateProject, mockListProjects, mockRepairProject } from "@/lib/server/mock-data";
import { setRepositorySecret } from "@/lib/server/repo-secrets";
import type { CreateProjectInput, FactoryProject, RepairStep } from "@/lib/server/types";
import { findVercelProject, productionUrlFor, vercelRequest } from "@/lib/server/vercel";

export type { CreateProjectInput, FactoryProject } from "@/lib/server/types";

interface GitHubUser {
  login: string;
}

interface GitHubReference {
  object: { sha: string };
}

interface GitHubCommit {
  tree: { sha: string };
}

interface GitHubSha {
  sha: string;
}

export class ProvisionProjectError extends Error {
  partialProject?: FactoryProject;

  constructor(message: string, partialProject?: FactoryProject) {
    super(message);
    this.name = "ProvisionProjectError";
    this.partialProject = partialProject;
  }
}

const factoryLabels = [
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
];
const queueFiles = [
  ".github/workflows/feature-queue.yml",
  ".github/scripts/feature-queue.mjs",
  ".github/workflows/ci.yml",
];
export const copilotSecretName = "COPILOT_ASSIGN_TOKEN";

function copilotAssignToken(): string | undefined {
  return (
    process.env.FACTORY_COPILOT_ASSIGN_TOKEN?.trim() ||
    process.env.FACTORY_GITHUB_TOKEN?.trim() ||
    undefined
  );
}

async function createOrReuseRepository(
  owner: string,
  token: string,
  input: CreateProjectInput,
): Promise<GitHubRepository> {
  const user = await githubRequest<GitHubUser>("/user", token);
  const isPersonal = user.login.toLowerCase() === owner.toLowerCase();
  const endpoint = isPersonal ? "/user/repos" : `/orgs/${encodeURIComponent(owner)}/repos`;
  try {
    return await githubRequest<GitHubRepository>(endpoint, token, {
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
  } catch (error) {
    if (!(error instanceof GitHubError && error.status === 422)) throw error;
    const existing = await githubRequest<GitHubRepository>(`/repos/${owner}/${input.name}`, token);
    if (!existing.topics?.includes("factory-app")) {
      throw new Error(
        `A repository named ${input.name} already exists and wasn't created by this factory.`,
      );
    }
    return existing;
  }
}

async function setTopics(repo: GitHubRepository, token: string): Promise<void> {
  await githubRequest(`/repos/${repo.full_name}/topics`, token, {
    method: "PUT",
    body: JSON.stringify({ names: ["ai-code-factory", "factory-app"] }),
  });
}

async function commitFiles(
  repo: GitHubRepository,
  files: Record<string, string>,
  message: string,
  token: string,
): Promise<void> {
  const base = `/repos/${repo.full_name}`;
  const branch = encodeURIComponent(repo.default_branch);
  const reference = await githubRequest<GitHubReference>(`${base}/git/ref/heads/${branch}`, token);
  const parent = await githubRequest<GitHubCommit>(
    `${base}/git/commits/${reference.object.sha}`,
    token,
  );
  const tree = await githubRequest<GitHubSha>(`${base}/git/trees`, token, {
    method: "POST",
    body: JSON.stringify({
      base_tree: parent.tree.sha,
      tree: Object.entries(files).map(([path, content]) => ({
        path,
        mode: "100644",
        type: "blob",
        content,
      })),
    }),
  });
  const commit = await githubRequest<GitHubSha>(`${base}/git/commits`, token, {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: tree.sha,
      parents: [reference.object.sha],
    }),
  });
  await githubRequest(`${base}/git/refs/heads/${branch}`, token, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
}

async function ensureLabels(repo: GitHubRepository, token: string): Promise<void> {
  // Issue forms only apply labels that already exist.
  for (const label of factoryLabels) {
    try {
      await githubRequest(`/repos/${repo.full_name}/labels`, token, {
        method: "POST",
        body: JSON.stringify(label),
      });
    } catch (error) {
      if (!(error instanceof GitHubError && error.status === 422)) throw error;
    }
  }
}

async function ensureVercelProject(repo: GitHubRepository): Promise<string> {
  const existing = await findVercelProject(repo.name);
  if (existing) return productionUrlFor(existing);

  const project = await vercelRequest<{ id: string; name?: string }>("/v11/projects", {
    method: "POST",
    body: {
      name: repo.name,
      framework: "nextjs",
      outputDirectory: null,
      gitRepository: { type: "github", repo: repo.full_name },
    },
  });
  if (!project.name) throw new Error("Vercel created the project but returned no project name.");

  // The template commit landed before the project was linked, so Vercel won't build it on its own.
  await vercelRequest("/v13/deployments", {
    method: "POST",
    body: {
      name: project.name,
      project: project.name,
      target: "production",
      gitSource: { type: "github", repoId: repo.id, ref: repo.default_branch },
    },
  });
  return `https://${project.name}.vercel.app`;
}

async function ensureSecret(repo: GitHubRepository, token: string): Promise<void> {
  const value = copilotAssignToken();
  if (!value) throw new Error("Set FACTORY_COPILOT_ASSIGN_TOKEN to copy it into the repository.");
  await setRepositorySecret(repo.full_name, copilotSecretName, value, token);
}

async function queueWorkflowCurrent(repo: GitHubRepository, token: string): Promise<boolean> {
  for (const path of queueFiles) {
    try {
      const file = await githubRequest<{ content: string }>(
        `/repos/${repo.full_name}/contents/${path}`,
        token,
      );
      if (Buffer.from(file.content, "base64").toString("utf8") !== appTemplateFiles[path]) {
        return false;
      }
    } catch (error) {
      if (error instanceof GitHubError && error.status === 404) return false;
      throw error;
    }
  }
  return true;
}

async function labelsPresent(repo: GitHubRepository, token: string): Promise<boolean> {
  const labels = await githubRequest<Array<{ name: string }>>(
    `/repos/${repo.full_name}/labels?per_page=100`,
    token,
  );
  const names = new Set(labels.map((label) => label.name));
  return factoryLabels.every((label) => names.has(label.name));
}

async function secretPresent(repo: GitHubRepository, token: string): Promise<boolean> {
  try {
    await githubRequest(`/repos/${repo.full_name}/actions/secrets/${copilotSecretName}`, token);
    return true;
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return false;
    throw error;
  }
}

export async function inspectProject(
  repo: GitHubRepository,
  token: string,
): Promise<FactoryProject> {
  const [template, workflow, labels, vercel, secret] = await Promise.all([
    repositoryFileExists(repo.full_name, "package.json", token),
    queueWorkflowCurrent(repo, token),
    labelsPresent(repo, token),
    findVercelProject(repo.name),
    secretPresent(repo, token),
  ]);
  const repairSteps: RepairStep[] = [];
  if (!template) repairSteps.push("template");
  if (!workflow) repairSteps.push("workflow");
  if (!labels) repairSteps.push("labels");
  if (!vercel) repairSteps.push("vercel");
  if (!secret) repairSteps.push("secret");
  return {
    ...toFactoryProject(repo, vercel ? productionUrlFor(vercel) : undefined),
    repairSteps,
  };
}

async function listOwnedRepositories(owner: string, token: string): Promise<GitHubRepository[]> {
  const repositories: GitHubRepository[] = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await githubRequest<GitHubRepository[]>(
      `/user/repos?visibility=all&affiliation=owner,organization_member&sort=updated&per_page=100&page=${page}`,
      token,
    );
    repositories.push(...batch);
    if (batch.length < 100) break;
  }
  return repositories.filter(
    (repository) =>
      repository.topics?.includes("factory-app") &&
      repository.full_name.split("/")[0]?.toLowerCase() === owner.toLowerCase(),
  );
}

export async function listFactoryProjects(): Promise<FactoryProject[]> {
  if (usingMocks()) return mockListProjects();
  const owner = requiredEnv("FACTORY_GITHUB_OWNER");
  const token = githubToken();
  const repositories = await listOwnedRepositories(owner, token);
  return Promise.all(
    repositories.map((repo) => inspectProject(repo, token).catch(() => toFactoryProject(repo))),
  );
}

export async function provisionProject(input: CreateProjectInput): Promise<FactoryProject> {
  const name = input.name.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 100) {
    throw new Error("Use lowercase letters, numbers, and single dashes for the project name.");
  }
  if (input.visibility !== "private" && input.visibility !== "public") {
    throw new Error("Choose private or public repository visibility.");
  }
  if (usingMocks()) return mockCreateProject({ ...input, name });

  const owner = requiredEnv("FACTORY_GITHUB_OWNER");
  const token = githubToken();
  requiredEnv("VERCEL_ACCESS_TOKEN");
  let repo: GitHubRepository | undefined;

  try {
    repo = await createOrReuseRepository(owner, token, { ...input, name });
    // Tag first so a failed run still shows up on the dashboard for repair.
    await setTopics(repo, token);
    if (!(await repositoryFileExists(repo.full_name, "package.json", token))) {
      await commitFiles(repo, appTemplateFiles, "chore: scaffold app from AI Code Factory", token);
    }
    await ensureLabels(repo, token);
    const productionUrl = await ensureVercelProject(repo);
    const repairSteps: RepairStep[] = [];
    await ensureSecret(repo, token).catch(() => repairSteps.push("secret"));
    return {
      ...toFactoryProject(repo, productionUrl),
      createdAt: new Date().toISOString(),
      repairSteps,
    };
  } catch (error) {
    throw new ProvisionProjectError(
      error instanceof Error ? error.message : "Project creation failed.",
      repo ? { ...toFactoryProject(repo), repairSteps: ["vercel"] } : undefined,
    );
  }
}

export async function repairProject(repository: string): Promise<FactoryProject> {
  if (usingMocks()) return mockRepairProject(repository);
  const token = githubToken();
  const repo = await getFactoryRepository(repository, token);
  const { repairSteps = [] } = await inspectProject(repo, token);

  if (repairSteps.includes("template")) {
    await commitFiles(repo, appTemplateFiles, "chore: scaffold app from AI Code Factory", token);
  } else if (repairSteps.includes("workflow")) {
    await commitFiles(
      repo,
      Object.fromEntries(queueFiles.map((path) => [path, appTemplateFiles[path] ?? ""])),
      "chore: update feature queue from AI Code Factory",
      token,
    );
  }
  if (repairSteps.includes("labels")) await ensureLabels(repo, token);
  if (repairSteps.includes("vercel")) await ensureVercelProject(repo);
  if (repairSteps.includes("secret")) await ensureSecret(repo, token);

  return inspectProject(repo, token);
}
