import { maxPromptLength, startMvp } from "@/lib/server/app-prompt";
import { factoryAuthResponse } from "@/lib/server/factory-auth";
import { providerCredentialsConfigured, usingMocks } from "@/lib/server/github";
import { mockOwner } from "@/lib/server/mock-data";
import {
  listFactoryProjects,
  ProvisionProjectError,
  provisionProject,
} from "@/lib/server/provision-project";
import { crossOriginResponse } from "@/lib/server/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasProviderCredentials(): boolean {
  return usingMocks() || providerCredentialsConfigured();
}

function factoryOwner(): string | undefined {
  return usingMocks() ? mockOwner : process.env.FACTORY_GITHUB_OWNER || undefined;
}

export async function GET(request: Request) {
  const authResponse = factoryAuthResponse(request);
  if (authResponse) return authResponse;
  if (!hasProviderCredentials()) {
    return Response.json(
      {
        configured: false,
        owner: factoryOwner(),
        projects: [],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const owner = factoryOwner();
  try {
    const projects = await listFactoryProjects();
    return Response.json(
      { configured: true, mock: usingMocks(), owner, projects },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        configured: true,
        owner,
        projects: [],
        error: error instanceof Error ? error.message : "Unable to load projects.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  const authResponse = factoryAuthResponse(request);
  if (authResponse) return authResponse;

  const originResponse = crossOriginResponse(request);
  if (originResponse) return originResponse;
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

  const { name, description, prompt, visibility } = body as Record<string, unknown>;
  if (typeof name !== "string" || name.length > 100) {
    return Response.json({ error: "Enter a project name of 1–100 characters." }, { status: 400 });
  }
  if (description !== undefined && (typeof description !== "string" || description.length > 350)) {
    return Response.json(
      { error: "Description must be 350 characters or fewer." },
      { status: 400 },
    );
  }
  if (prompt !== undefined && (typeof prompt !== "string" || prompt.length > maxPromptLength)) {
    return Response.json(
      {
        error: `Describe the app in ${maxPromptLength.toLocaleString("en-US")} characters or fewer.`,
      },
      { status: 400 },
    );
  }
  if (visibility !== "private" && visibility !== "public") {
    return Response.json({ error: "Choose private or public visibility." }, { status: 400 });
  }
  const appPrompt = typeof prompt === "string" ? prompt.trim() : "";

  try {
    const project = await provisionProject({
      name,
      description: typeof description === "string" ? description : undefined,
      prompt: appPrompt || undefined,
      visibility,
    });
    if (!appPrompt) {
      return Response.json({ project }, { status: 201, headers: { "Cache-Control": "no-store" } });
    }
    // The project exists either way, so an MVP failure is reported without failing the request.
    const mvp = await startMvp(project, appPrompt).catch((error: unknown) =>
      error instanceof Error ? error : new Error("Could not create the MVP issue."),
    );
    return Response.json(
      mvp instanceof Error ? { project, mvpError: mvp.message } : { project, mvp },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
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
