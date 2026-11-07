import { deriveFeatureState } from "@/lib/server/feature-state";
import type {
  CheckStatus,
  CreateProjectInput,
  FactoryProject,
  FeatureItem,
  ProductionStatus,
  QueueStatus,
} from "@/lib/server/types";

export const mockOwner = "demo-factory";

interface MockFeature {
  number: number;
  title: string;
  createdAt: string;
  closed: boolean;
  queued: boolean;
  assigned: boolean;
  pr?: {
    number: number;
    title: string;
    state: "OPEN" | "CLOSED" | "MERGED";
    isDraft: boolean;
    checks: CheckStatus;
    preview?: boolean;
  };
}

interface MockRepo {
  project: FactoryProject;
  features: MockFeature[];
  production?: ProductionStatus;
  paused: boolean;
  queueEnabled: boolean;
  nextNumber: number;
}

type MockStore = Map<string, MockRepo>;

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

function mockProject(
  name: string,
  visibility: "private" | "public" = "private",
  productionUrl?: string,
): FactoryProject {
  const repository = `${mockOwner}/${name}`;
  return {
    name,
    repository,
    repositoryUrl: `https://github.com/${repository}`,
    httpsCloneUrl: `https://github.com/${repository}.git`,
    sshCloneUrl: `git@github.com:${repository}.git`,
    cloneCommand: `gh repo clone ${repository}`,
    productionUrl,
    createdAt: hoursAgo(72),
    visibility,
  };
}

function seed(): MockStore {
  const store: MockStore = new Map();
  // Suffixed alias: what Vercel assigns when recipe-box.vercel.app belongs to someone else.
  const recipeBoxUrl = `https://recipe-box-${mockOwner}.vercel.app`;
  store.set(`${mockOwner}/recipe-box`, {
    project: mockProject("recipe-box", "public", recipeBoxUrl),
    production: {
      url: recipeBoxUrl,
      state: "READY",
      sha: "4f9c2ab1d3e0",
      createdAt: hoursAgo(2),
    },
    paused: false,
    queueEnabled: true,
    nextNumber: 7,
    features: [
      {
        number: 1,
        title: "Save recipes from a URL",
        createdAt: hoursAgo(48),
        closed: true,
        queued: false,
        assigned: true,
        pr: {
          number: 7,
          title: "Save recipes from a URL",
          state: "MERGED",
          isDraft: false,
          checks: "passing",
        },
      },
      {
        number: 2,
        title: "Weekly meal planner",
        createdAt: hoursAgo(30),
        closed: false,
        queued: false,
        assigned: true,
        pr: {
          number: 8,
          title: "Add weekly meal planner",
          state: "OPEN",
          isDraft: false,
          checks: "passing",
          preview: true,
        },
      },
      {
        number: 3,
        title: "Shopping list from planned meals",
        createdAt: hoursAgo(6),
        closed: false,
        queued: true,
        assigned: true,
        pr: {
          number: 9,
          title: "[WIP] Shopping list from planned meals",
          state: "OPEN",
          isDraft: true,
          checks: "pending",
          preview: true,
        },
      },
      {
        number: 4,
        title: "Share a recipe by link",
        createdAt: hoursAgo(5),
        closed: false,
        queued: true,
        assigned: false,
      },
      {
        number: 5,
        title: "Dark mode",
        createdAt: hoursAgo(5),
        closed: false,
        queued: true,
        assigned: false,
      },
      {
        number: 6,
        title: "Recipe ratings",
        createdAt: hoursAgo(1),
        closed: false,
        queued: false,
        assigned: false,
      },
    ],
  });
  store.set(`${mockOwner}/trail-tracker`, {
    project: {
      ...mockProject("trail-tracker", "private", "https://trail-tracker.vercel.app"),
      repairSteps: ["workflow", "secret"],
    },
    production: {
      url: "https://trail-tracker.vercel.app",
      state: "ERROR",
      sha: "a17be09c55f2",
      createdAt: hoursAgo(1),
    },
    paused: true,
    queueEnabled: true,
    nextNumber: 3,
    features: [
      {
        number: 1,
        title: "Log a hike with distance and time",
        createdAt: hoursAgo(20),
        closed: false,
        queued: false,
        assigned: true,
        pr: {
          number: 2,
          title: "Log hikes with distance and time",
          state: "OPEN",
          isDraft: false,
          checks: "failing",
          preview: true,
        },
      },
    ],
  });
  store.set(`${mockOwner}/pet-sitter`, {
    project: { ...mockProject("pet-sitter"), createdAt: hoursAgo(0) },
    paused: false,
    queueEnabled: true,
    nextNumber: 1,
    features: [],
  });
  return store;
}

// Route handlers and pages can load separate module instances in dev; share one store per process.
const globalStore = globalThis as typeof globalThis & {
  __factoryMockStore?: MockStore;
};

function store(): MockStore {
  globalStore.__factoryMockStore ??= seed();
  return globalStore.__factoryMockStore;
}

export function resetMockStore(): void {
  globalStore.__factoryMockStore = seed();
}

function repoFor(repository: string): MockRepo {
  const repo = store().get(repository);
  if (!repo) throw new Error("Unknown factory repository.");
  return repo;
}

export function mockListProjects(): FactoryProject[] {
  return [...store().values()].map((repo) => repo.project);
}

export function mockGetProject(repository: string): FactoryProject | null {
  return store().get(repository)?.project ?? null;
}

export function mockCreateProject(input: CreateProjectInput): FactoryProject {
  const repository = `${mockOwner}/${input.name}`;
  if (store().has(repository))
    throw new Error("GitHub API 422: name already exists on this account");
  const project = {
    ...mockProject(input.name, input.visibility),
    createdAt: hoursAgo(0),
  };
  store().set(repository, {
    project,
    paused: false,
    queueEnabled: true,
    nextNumber: 1,
    features: [],
  });
  return project;
}

export function mockRepairProject(repository: string): FactoryProject {
  const repo = repoFor(repository);
  repo.project = { ...repo.project, repairSteps: [] };
  return repo.project;
}

export function mockFeatures(repository: string): FeatureItem[] {
  const { project, features } = repoFor(repository);
  return [...features]
    .sort((a, b) => b.number - a.number)
    .map((feature) => ({
      number: feature.number,
      title: feature.title,
      url: `${project.repositoryUrl}/issues/${feature.number}`,
      createdAt: feature.createdAt,
      state: deriveFeatureState(
        {
          state: feature.closed ? "CLOSED" : "OPEN",
          queued: feature.queued,
          assignedToCopilot: feature.assigned,
        },
        feature.pr,
      ),
      pullRequest: feature.pr && {
        number: feature.pr.number,
        title: feature.pr.title,
        url: `${project.repositoryUrl}/pull/${feature.pr.number}`,
        state: feature.pr.state,
        isDraft: feature.pr.isDraft,
        checks: feature.pr.checks,
        preview: feature.pr.preview
          ? {
              url: `https://${project.name}-git-pr-${feature.pr.number}.vercel.app`,
              state: feature.pr.checks === "pending" ? "BUILDING" : "READY",
            }
          : undefined,
      },
    }));
}

export function mockProduction(repository: string): ProductionStatus | undefined {
  return repoFor(repository).production;
}

export function mockQueue(repository: string): QueueStatus {
  const { project, features, paused, queueEnabled } = repoFor(repository);
  const issueUrl = (number: number) => `${project.repositoryUrl}/issues/${number}`;
  return {
    enabled: queueEnabled,
    paused,
    pending: features
      .filter(isPending)
      .sort((a, b) => a.number - b.number)
      .map((feature) => ({
        number: feature.number,
        title: feature.title,
        url: issueUrl(feature.number),
      })),
    items: features
      .filter((feature) => feature.queued && !feature.closed && feature.pr?.state !== "MERGED")
      .sort((a, b) => a.number - b.number)
      .map((feature, index) => ({
        number: feature.number,
        title: feature.title,
        url: issueUrl(feature.number),
        position: index + 1,
        assignedToCopilot: feature.assigned,
      })),
  };
}

function isPending(feature: MockFeature): boolean {
  return !feature.closed && !feature.queued && !feature.assigned && !feature.pr;
}

function pendingFeature(repo: MockRepo, number: number): MockFeature {
  const feature = repo.features.find((item) => item.number === number);
  if (!feature || !isPending(feature)) throw new Error(`Issue #${number} isn't awaiting approval.`);
  return feature;
}

function advanceQueue(repo: MockRepo): void {
  if (repo.paused) return;
  const open = repo.features
    .filter((feature) => feature.queued && !feature.closed)
    .sort((a, b) => a.number - b.number);
  if (open.length && !open.some((feature) => feature.assigned)) open[0].assigned = true;
}

export function mockSubmitFeatures(repository: string, titles: string[]) {
  const repo = repoFor(repository);
  const created = titles.map((title) => {
    const feature: MockFeature = {
      number: repo.nextNumber++,
      title,
      createdAt: hoursAgo(0),
      closed: false,
      queued: false,
      assigned: false,
    };
    repo.features.push(feature);
    return feature;
  });
  const first = created[0];
  return {
    number: first?.number ?? 0,
    url: `${repo.project.repositoryUrl}/issues/${first?.number ?? ""}`,
  };
}

export function mockApproveFeatures(repository: string, numbers: number[]): void {
  const repo = repoFor(repository);
  const features = numbers.map((number) => pendingFeature(repo, number));
  for (const feature of features) feature.queued = true;
  advanceQueue(repo);
}

export function mockRejectFeature(repository: string, number: number): void {
  pendingFeature(repoFor(repository), number).closed = true;
}

export function mockMergePullRequest(repository: string, number: number): boolean {
  const repo = repoFor(repository);
  const feature = repo.features.find((item) => item.pr?.number === number);
  const pr = feature?.pr;
  if (!feature || pr?.state !== "OPEN") throw new Error(`PR #${number} isn't open.`);
  pr.isDraft = false;
  if (pr.checks !== "passing") return false;
  pr.state = "MERGED";
  feature.closed = true;
  advanceQueue(repo);
  return true;
}

export function mockSetPaused(repository: string, paused: boolean): void {
  const repo = repoFor(repository);
  repo.paused = paused;
  advanceQueue(repo);
}

export function mockRetryQueue(repository: string): void {
  advanceQueue(repoFor(repository));
}
