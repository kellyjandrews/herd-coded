import { factoryAuthResponse } from "@/lib/server/factory-auth";
import { repairProject } from "@/lib/server/provision-project";
import { crossOriginResponse } from "@/lib/server/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const authResponse = factoryAuthResponse(request);
  if (authResponse) return authResponse;
  const originResponse = crossOriginResponse(request);
  if (originResponse) return originResponse;

  const { owner, repo } = await params;
  try {
    const project = await repairProject(`${owner}/${repo}`);
    return Response.json({ project }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Repair failed.";
    return Response.json(
      { error: message },
      {
        status: message.startsWith("Unknown factory repository") ? 404 : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
