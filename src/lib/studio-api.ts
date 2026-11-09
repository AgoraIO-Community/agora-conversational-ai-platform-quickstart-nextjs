import { V3ConfigurationError } from "agora-agents";

import { consoleConfigured, projectCertificate } from "@/lib/app-credentials.mjs";
import { studioAuthorization } from "@/lib/parity-contract.mjs";

export type StudioApiResult = {
  ok: boolean;
  status: number;
  data: unknown;
};

const SENSITIVE_STUDIO_FIELDS =
  /^(authorization|password|secret|token|key|certificate|sign[_-]?key|app[_-]?certificate|api[_-]?key|access[_-]?key|private[_-]?key|auth[_-]?jwt|.+[_-](password|secret|token|jwt|certificate))$/i;

const SUMMARY_FIELDS = new Set([
  "code",
  "message",
  "project",
  "projects",
  "status",
]);

function redactStudioValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactStudioValue);
  if (typeof value !== "object" || value === null) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_STUDIO_FIELDS.test(key)
        ? "[REDACTED]"
        : redactStudioValue(entry),
    ]),
  );
}

function summarizeStudioValue(value: unknown): unknown {
  if (Array.isArray(value)) return { count: value.length };
  if (typeof value !== "object" || value === null) {
    if (typeof value === "string" && value.length > 160) {
      return `${value.slice(0, 157)}...`;
    }
    return value;
  }

  const source = value as Record<string, unknown>;
  const summary: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(source)) {
    if (key === "items" || key === "list") {
      summary[`${key}_count`] = Array.isArray(entry) ? entry.length : 0;
    } else if (key === "data") {
      summary.data = summarizeStudioValue(entry);
    } else if (SUMMARY_FIELDS.has(key)) {
      summary[key] = summarizeStudioValue(entry);
    }
  }

  if (Object.keys(summary).length === 0) {
    summary.fields = Object.keys(source);
  }
  return summary;
}

function debugRequestBody(body: BodyInit | null | undefined): unknown {
  if (!body) return undefined;
  if (typeof body !== "string") return "[non-JSON body omitted]";

  try {
    return summarizeStudioValue(redactStudioValue(JSON.parse(body)));
  } catch {
    return "[non-JSON body omitted]";
  }
}

function studioDebugEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.AGORA_STUDIO_DEBUG === "true"
  );
}

function getStudioAuthorization(): string {
  return studioAuthorization(
    process.env.AGORA_CUSTOMER_ID,
    process.env.AGORA_CUSTOMER_SECRET,
  );
}

function getStudioApiBase(): string {
  const configuredBase = process.env.AGORA_STUDIO_API_BASE
    ?.trim()
    .replace(/\/$/, "");
  if (configuredBase) return configuredBase;

  // Only the console projects API (`/dev/v1/projects`) uses this helper; all
  // Conversational AI resources go through the agora-agents v3 SDK.
  return "https://api.agora.io";
}

export async function studioApiRequest(
  path: string,
  init: RequestInit = {},
): Promise<StudioApiResult> {
  const requestId = crypto.randomUUID();
  const method = init.method?.toUpperCase() ?? "GET";
  const url = `${getStudioApiBase()}${path}`;
  const startedAt = Date.now();
  const headers = new Headers(init.headers);
  headers.set("Authorization", getStudioAuthorization());
  headers.set("Accept", "application/json");
  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (studioDebugEnabled()) {
    console.info(
      "[console-api] request",
      JSON.stringify(
        {
          requestId,
          method,
          url,
          body: debugRequestBody(init.body),
        },
      ),
    );
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    console.error(
      "[console-api] network error",
      JSON.stringify(
        {
          requestId,
          method,
          url,
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
    throw error;
  }
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (studioDebugEnabled()) {
    const details = JSON.stringify(
      {
        requestId,
        method,
        url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        durationMs: Date.now() - startedAt,
        response: response.ok
          ? summarizeStudioValue(redactStudioValue(data))
          : redactStudioValue(data),
      },
    );
    if (response.ok) {
      console.info("[console-api] response", details);
    } else {
      console.error("[console-api] response", details);
    }
  }

  return { ok: response.ok, status: response.status, data };
}

export function studioResponseSucceeded(result: StudioApiResult): boolean {
  if (!result.ok) return false;
  if (typeof result.data !== "object" || result.data === null) return true;
  const code = (result.data as { code?: unknown }).code;
  return typeof code !== "number" || code === 0;
}

/** True when AGORA_CUSTOMER_ID/SECRET are set, which enables the project picker. */
export function consoleEnabled(): boolean {
  return consoleConfigured(
    process.env.AGORA_CUSTOMER_ID,
    process.env.AGORA_CUSTOMER_SECRET,
  );
}

const CERTIFICATE_TTL_MS = 5 * 60 * 1000;
const certificateCache = new Map<string, { value: string; expires: number }>();

/**
 * Server-only lookup of a picker-selected project's App Certificate. The
 * value is cached briefly and never returned to the browser.
 */
export async function lookupProjectCertificate(appId: string): Promise<string> {
  const cached = certificateCache.get(appId);
  if (cached && cached.expires > Date.now()) return cached.value;
  const upstream = await studioApiRequest("/dev/v1/projects");
  if (!studioResponseSucceeded(upstream)) {
    throw new V3ConfigurationError(
      `Could not load the App Certificate for project ${appId} from Agora Console (HTTP ${upstream.status}).`,
    );
  }
  const value = projectCertificate(upstream.data, appId);
  if (value) {
    certificateCache.set(appId, { value, expires: Date.now() + CERTIFICATE_TTL_MS });
  }
  return value;
}
