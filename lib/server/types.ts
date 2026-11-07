export interface FactoryProject {
  name: string;
  repository: string;
  repositoryUrl: string;
  httpsCloneUrl: string;
  sshCloneUrl: string;
  cloneCommand: string;
  productionUrl?: string;
  createdAt?: string;
  visibility?: "private" | "public";
  repairSteps?: RepairStep[];
}

export type RepairStep = "template" | "workflow" | "labels" | "vercel" | "secret";

export interface CreateProjectInput {
  name: string;
  description?: string;
  visibility: "private" | "public";
}

export interface FeatureIssue {
  number: number;
  url: string;
}

export type FeatureState = "open" | "queued" | "working" | "pr-open" | "done";
export type CheckStatus = "passing" | "failing" | "pending" | "none";
export type DeploymentState = "READY" | "BUILDING" | "QUEUED" | "ERROR" | "CANCELED" | "UNKNOWN";

export interface FeaturePullRequest {
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  isDraft: boolean;
  checks: CheckStatus;
  preview?: { url: string; state: DeploymentState };
}

export interface FeatureItem {
  number: number;
  title: string;
  url: string;
  state: FeatureState;
  createdAt: string;
  pullRequest?: FeaturePullRequest;
}

export interface ProductionStatus {
  url: string;
  state: DeploymentState;
  sha?: string;
  createdAt?: string;
  inspectorUrl?: string;
}

export interface QueueItem {
  number: number;
  title: string;
  url: string;
  position: number;
  assignedToCopilot: boolean;
}

export interface QueueStatus {
  enabled: boolean;
  paused: boolean;
  items: QueueItem[];
}

export type Section<T> = { ok: true; data: T } | { ok: false; error: string };

export interface ProjectActivity {
  project: FactoryProject;
  features: Section<FeatureItem[]>;
  production: Section<ProductionStatus>;
  queue: Section<QueueStatus>;
}
