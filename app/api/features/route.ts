import { factoryRequestAuthorized, unauthorizedFactoryResponse } from "@/lib/server/factory-auth";
import { createCopilotFeatureIssue, createFeatureBatchIssue } from "@/lib/server/provision-project";
import { crossOriginResponse } from "@/lib/server/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!factoryRequestAuthorized(request.headers.get("authorization"))) {
    return unauthorizedFactoryResponse();
  }
  const originResponse = crossOriginResponse(request);
  if (originResponse) return originResponse;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const { repository, title, details, csv, fileName } = body;
  if (typeof repository === "string" && typeof csv === "string") {
    const header = (csv.split(/\r?\n/, 1)[0] ?? "")
      .split(",")
      .map((name) => name.trim().replace(/^"|"$/g, "").toLowerCase());
    if (!header.includes("title")) {
      return Response.json(
        {
          error: "The CSV's first row must be a header with title, body, and labels columns.",
        },
        { status: 400 },
      );
    }
    // The CSV is wrapped in a fenced block, and issue bodies max out at 65,536 characters.
    if (csv.includes("```") || csv.length > 60000) {
      return Response.json(
        {
          error: "The CSV must be under 60,000 characters and contain no ``` fences.",
        },
        { status: 400 },
      );
    }
    const name = typeof fileName === "string" && fileName.trim() ? fileName.trim() : "features.csv";
    try {
      const issue = await createFeatureBatchIssue(repository, name.slice(0, 100), csv);
      return Response.json(
        { issue, batch: true },
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      return Response.json(
        {
          error: error instanceof Error ? error.message : "Could not queue the feature batch.",
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
  }
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
