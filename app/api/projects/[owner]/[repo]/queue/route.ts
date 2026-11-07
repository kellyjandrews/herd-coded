import { factoryAuthResponse } from "@/lib/server/factory-auth";
import {
  approveFeatures,
  getQueueStatus,
  mergeFeaturePullRequest,
  rejectFeature,
  retryQueue,
  setQueuePaused,
} from "@/lib/server/feature-queue";
import { crossOriginResponse } from "@/lib/server/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ owner: string; repo: string }> };

const noStore = { "Cache-Control": "no-store" };

function failure(error: unknown, fallback: string): Response {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.startsWith("Unknown factory repository")
    ? 404
    : message.includes("isn't awaiting approval") || message.includes("isn't open")
      ? 409
      : 502;
  return Response.json({ error: message }, { status, headers: noStore });
}

const isIssueNumber = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) > 0;

export async function GET(request: Request, { params }: Context) {
  const authResponse = factoryAuthResponse(request);
  if (authResponse) return authResponse;
  const { owner, repo } = await params;
  try {
    return Response.json({ queue: await getQueueStatus(`${owner}/${repo}`) }, { headers: noStore });
  } catch (error) {
    return failure(error, "Could not load the feature queue.");
  }
}

export async function POST(request: Request, { params }: Context) {
  const authResponse = factoryAuthResponse(request);
  if (authResponse) return authResponse;
  const originResponse = crossOriginResponse(request);
  if (originResponse) return originResponse;

  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    issues?: unknown;
    issue?: unknown;
    pullRequest?: unknown;
  } | null;
  const action = body?.action;
  const issues = body?.issues;
  const issue = body?.issue;
  const pullRequest = body?.pullRequest;
  if (
    action !== "pause" &&
    action !== "resume" &&
    action !== "retry" &&
    action !== "approve" &&
    action !== "reject" &&
    action !== "merge"
  ) {
    return Response.json(
      {
        error: "Action must be pause, resume, retry, approve, reject, or merge.",
      },
      { status: 400, headers: noStore },
    );
  }
  if (
    action === "approve" &&
    !(
      Array.isArray(issues) &&
      issues.length > 0 &&
      issues.length <= 100 &&
      issues.every(isIssueNumber)
    )
  ) {
    return Response.json(
      { error: "Approve needs a list of issue numbers." },
      { status: 400, headers: noStore },
    );
  }
  if (action === "reject" && !isIssueNumber(issue)) {
    return Response.json(
      { error: "Reject needs an issue number." },
      { status: 400, headers: noStore },
    );
  }
  if (action === "merge" && !isIssueNumber(pullRequest)) {
    return Response.json(
      { error: "Merge needs a pull request number." },
      { status: 400, headers: noStore },
    );
  }

  const { owner, repo } = await params;
  const repository = `${owner}/${repo}`;
  try {
    let merged: boolean | undefined;
    if (action === "retry") await retryQueue(repository);
    else if (action === "approve") await approveFeatures(repository, issues as number[]);
    else if (action === "reject") await rejectFeature(repository, issue as number);
    else if (action === "merge")
      ({ merged } = await mergeFeaturePullRequest(repository, pullRequest as number));
    else await setQueuePaused(repository, action === "pause");
    return Response.json({ queue: await getQueueStatus(repository), merged }, { headers: noStore });
  } catch (error) {
    return failure(error, "Could not update the feature queue.");
  }
}
