import type { CheckStatus, FeatureState } from "@/lib/server/types";

export interface IssueFacts {
  state: "OPEN" | "CLOSED";
  queued: boolean;
  assignedToCopilot: boolean;
}

export interface PullRequestFacts {
  state: "OPEN" | "CLOSED" | "MERGED";
  isDraft: boolean;
  title: string;
}

export function deriveFeatureState(issue: IssueFacts, pr?: PullRequestFacts): FeatureState {
  if (issue.state === "CLOSED" || pr?.state === "MERGED") return "done";
  // Copilot keeps a "[WIP]" draft open while it works, then retitles it for review.
  if (pr?.state === "OPEN") return pr.isDraft && /^\[WIP\]/i.test(pr.title) ? "working" : "pr-open";
  if (pr?.state === "CLOSED") return issue.queued ? "queued" : "open";
  if (issue.assignedToCopilot) return "working";
  if (issue.queued) return "queued";
  return "open";
}

export function checkStatusFromRollup(state: string | null | undefined): CheckStatus {
  switch (state) {
    case "SUCCESS":
      return "passing";
    case "FAILURE":
    case "ERROR":
      return "failing";
    case "PENDING":
    case "EXPECTED":
      return "pending";
    default:
      return "none";
  }
}

export function isCopilotLogin(login: string): boolean {
  return login.toLowerCase().includes("copilot");
}
