import { NextResponse } from "next/server";

import {
  getProjectAppId,
  getSessionUser,
  setProjectCookie,
} from "@/lib/auth";
import { getAppId } from "@/lib/env";
import {
  consoleEnabled,
  studioApiRequest,
  studioResponseSucceeded,
} from "@/lib/studio-api";
import { sanitizeAgoraProject } from "@/lib/parity-contract.mjs";

export const runtime = "nodejs";

type SafeProject = {
  id: string;
  name: string;
  appId: string;
  status: 0 | 1;
  created: number | null;
};

function projectList(value: unknown): SafeProject[] {
  if (typeof value !== "object" || value === null) return [];
  const projects = (value as { projects?: unknown }).projects;
  if (!Array.isArray(projects)) return [];
  return projects
    .map((project) => sanitizeAgoraProject(project) as SafeProject | null)
    .filter((project): project is SafeProject => project !== null);
}

function projectFromCreate(value: unknown): SafeProject | null {
  if (typeof value !== "object" || value === null) return null;
  return sanitizeAgoraProject((value as { project?: unknown }).project) as
    | SafeProject
    | null;
}

function upstreamError(value: unknown, fallback: string): string {
  if (typeof value !== "object" || value === null) return fallback;
  const message = (value as { message?: unknown }).message;
  return typeof message === "string" && message ? message : fallback;
}

const CONSOLE_REQUIRED =
  "Set AGORA_CUSTOMER_ID and AGORA_CUSTOMER_SECRET to list, create, and switch Agora projects.";

/** Without Console credentials, the only project is the configured AGORA_APP_ID. */
function configuredProject(): SafeProject {
  return { id: "configured", name: "Configured project", appId: getAppId(), status: 1, created: null };
}

async function requireUser() {
  return await getSessionUser();
}

async function fetchProjects(): Promise<{
  projects: SafeProject[];
  error?: NextResponse;
}> {
  const upstream = await studioApiRequest("/dev/v1/projects");
  if (!studioResponseSucceeded(upstream)) {
    return {
      projects: [],
      error: NextResponse.json(
        {
          error: upstreamError(
            upstream.data,
            "Could not load Agora projects.",
          ),
        },
        { status: upstream.ok ? 502 : upstream.status },
      ),
    };
  }
  return { projects: projectList(upstream.data) };
}

export async function GET() {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!consoleEnabled()) {
    const project = configuredProject();
    return NextResponse.json({
      projects: [project],
      selectedAppId: project.appId,
      consoleEnabled: false,
    });
  }

  const result = await fetchProjects();
  if (result.error) return result.error;
  const requestedAppId = (await getProjectAppId()) || getAppId();
  const selectedAppId = result.projects.some(
    (project) => project.appId === requestedAppId,
  )
    ? requestedAppId
    : result.projects[0]?.appId || "";
  if (selectedAppId && selectedAppId !== (await getProjectAppId())) {
    await setProjectCookie(selectedAppId);
  }
  return NextResponse.json({
    projects: result.projects,
    selectedAppId,
    consoleEnabled: true,
  });
}

export async function POST(request: Request) {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!consoleEnabled()) {
    return NextResponse.json({ error: CONSOLE_REQUIRED }, { status: 400 });
  }

  const body: unknown = await request.json().catch(() => null);
  const name =
    typeof body === "object" &&
    body !== null &&
    typeof (body as { name?: unknown }).name === "string"
      ? (body as { name: string }).name.trim()
      : "";
  if (!name || name.length > 255) {
    return NextResponse.json(
      { error: "Project name must contain 1 to 255 characters." },
      { status: 400 },
    );
  }

  const upstream = await studioApiRequest("/dev/v1/project", {
    method: "POST",
    body: JSON.stringify({ name, enable_sign_key: true }),
  });
  if (!studioResponseSucceeded(upstream)) {
    return NextResponse.json(
      {
        error: upstreamError(upstream.data, "Could not create Agora project."),
      },
      { status: upstream.ok ? 502 : upstream.status },
    );
  }
  const project = projectFromCreate(upstream.data);
  if (!project) {
    return NextResponse.json(
      { error: "Agora did not return the created project." },
      { status: 502 },
    );
  }
  await setProjectCookie(project.appId);
  return NextResponse.json({ project, selectedAppId: project.appId });
}

export async function PUT(request: Request) {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const appId =
    typeof body === "object" &&
    body !== null &&
    typeof (body as { appId?: unknown }).appId === "string"
      ? (body as { appId: string }).appId.trim()
      : "";
  if (!appId) {
    return NextResponse.json({ error: "An App ID is required." }, { status: 400 });
  }

  if (!consoleEnabled()) {
    if (appId !== getAppId()) {
      return NextResponse.json({ error: CONSOLE_REQUIRED }, { status: 400 });
    }
    return NextResponse.json({ selectedAppId: appId });
  }

  const result = await fetchProjects();
  if (result.error) return result.error;
  if (!result.projects.some((project) => project.appId === appId)) {
    return NextResponse.json(
      { error: "Project does not belong to this Agora customer." },
      { status: 404 },
    );
  }
  await setProjectCookie(appId);
  return NextResponse.json({ selectedAppId: appId });
}
