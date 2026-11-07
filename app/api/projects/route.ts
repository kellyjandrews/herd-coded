import {
  factoryRequestAuthorized,
  missingFactoryAuthResponse,
  unauthorizedFactoryResponse,
} from "@/lib/server/factory-auth";
import {
  listFactoryProjects,
  ProvisionProjectError,
  provisionProject,
} from "@/lib/server/provision-project";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasProviderCredentials(): boolean {
  return Boolean(
    process.env.FACTORY_GITHUB_OWNER &&
      process.env.FACTORY_GITHUB_TOKEN &&
      process.env.VERCEL_ACCESS_TOKEN,
  );
}

function authorized(request: Request): Response | null {
  if (!factoryRequestAuthorized(request.headers.get("authorization"))) {
    if (process.env.NODE_ENV === "production" && !process.env.FACTORY_BASIC_AUTH_PASSWORD) {
      return missingFactoryAuthResponse();
    }
    return unauthorizedFactoryResponse();
  }
  return null;
}

export async function GET(request: Request) {
  const authResponse = authorized(request);
  if (authResponse) return authResponse;
  if (!hasProviderCredentials()) {
    return Response.json(
      { configured: false, projects: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const projects = await listFactoryProjects();
    return Response.json(
      { configured: true, projects },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        configured: true,
        projects: [],
        error: error instanceof Error ? error.message : "Unable to load projects.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  const authResponse = authorized(request);
  if (authResponse) return authResponse;

  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return Response.json(
      { error: "Cross-origin project creation is not allowed." },
      { status: 403 },
    );
  }
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json(
      { error: "Cross-origin project creation is not allowed." },
      { status: 403 },
    );
  }
  if (!hasProviderCredentials()) {
    return Response.json(
      { error: "Project provisioning is not configured on this factory." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Project details are required." }, { status: 400 });
  }

  const { name, description, visibility } = body as Record<string, unknown>;
  if (typeof name !== "string" || name.length > 100) {
    return Response.json({ error: "Enter a project name of 1–100 characters." }, { status: 400 });
  }
  if (description !== undefined && (typeof description !== "string" || description.length > 350)) {
    return Response.json(
      { error: "Description must be 350 characters or fewer." },
      { status: 400 },
    );
  }
  if (visibility !== "private" && visibility !== "public") {
    return Response.json({ error: "Choose private or public visibility." }, { status: 400 });
  }

  try {
    const project = await provisionProject({
      name,
      description: typeof description === "string" ? description : undefined,
      visibility,
    });
    return Response.json({ project }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ProvisionProjectError) {
      return Response.json(
        { error: error.message, partialProject: error.partialProject },
        {
          status: error.partialProject ? 502 : 400,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Project creation failed.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
