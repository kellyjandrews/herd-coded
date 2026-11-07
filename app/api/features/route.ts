import { factoryRequestAuthorized, unauthorizedFactoryResponse } from "@/lib/server/factory-auth";
import { createCopilotFeatureIssue } from "@/lib/server/provision-project";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!factoryRequestAuthorized(request.headers.get("authorization"))) {
    return unauthorizedFactoryResponse();
  }
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return Response.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const { repository, title, details } = body;
  if (typeof repository !== "string" || typeof title !== "string" || typeof details !== "string") {
    return Response.json(
      { error: "Repository, title, and details are required." },
      { status: 400 },
    );
  }
  if (!title.trim() || title.length > 200 || !details.trim() || details.length > 5000) {
    return Response.json(
      { error: "Enter a title (≤200 chars) and details (≤5000 chars)." },
      { status: 400 },
    );
  }

  try {
    const issue = await createCopilotFeatureIssue(repository, title.trim(), details.trim());
    return Response.json({ issue }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Could not create the feature issue.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
