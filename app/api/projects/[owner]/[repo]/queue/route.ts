import { factoryAuthResponse } from "@/lib/server/factory-auth";
import { getQueueStatus, retryQueue, setQueuePaused } from "@/lib/server/feature-queue";
import { crossOriginResponse } from "@/lib/server/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ owner: string; repo: string }> };

const noStore = { "Cache-Control": "no-store" };

function failure(error: unknown, fallback: string): Response {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.startsWith("Unknown factory repository") ? 404 : 502;
  return Response.json({ error: message }, { status, headers: noStore });
}

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
  } | null;
  const action = body?.action;
  if (action !== "pause" && action !== "resume" && action !== "retry") {
    return Response.json(
      { error: "Action must be pause, resume, or retry." },
      { status: 400, headers: noStore },
    );
  }

  const { owner, repo } = await params;
  const repository = `${owner}/${repo}`;
  try {
    if (action === "retry") await retryQueue(repository);
    else await setQueuePaused(repository, action === "pause");
    return Response.json({ queue: await getQueueStatus(repository) }, { headers: noStore });
  } catch (error) {
    return failure(error, "Could not update the feature queue.");
  }
}
