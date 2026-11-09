// Framework-free v3 route contract shared by /api/v3/* and /api/call.
// Kept in plain ESM so `node --test` can exercise it with a fake SDK client.

import {
  V3ConfigurationError,
  V3ConnectionError,
  V3Error,
  V3TimeoutError,
  V3ValidationError,
} from "agora-agents";

export const V3_RESOURCES = new Set([
  "agents",
  "secrets",
  "numbers",
  "campaigns",
  "sessions",
]);

const CAMPAIGN_ACTIONS = new Set(["pause", "resume", "cancel"]);
const INT_QUERY_KEYS = new Set(["limit", "started_after", "started_before"]);
const LIST_QUERY_KEYS = {
  agents: ["limit", "cursor", "order"],
  secrets: ["limit", "cursor", "order"],
  numbers: ["limit", "cursor", "order"],
  campaigns: ["limit", "cursor", "order", "status"],
  sessions: [
    "limit",
    "cursor",
    "status",
    "channel",
    "started_after",
    "started_before",
  ],
};

export class V3RouteError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const methodNotAllowed = () => new V3RouteError(405, "Method not allowed");
const unknownEndpoint = () => new V3RouteError(404, "Unknown API endpoint");

// Top-level body fields per write operation, from the v3 OpenAPI schemas.
// An allowlist (not a denylist) because SDK request objects also accept
// server-owned options such as `appid`, `id` and `ifMatch`: a browser body must
// never target another project or inject conditional headers.
const AGENT_FIELDS = [
  "agent_name",
  "instructions",
  "messages",
  "greeting",
  "variables",
  "pipeline",
  "filler_words",
];
const NUMBER_FIELDS = ["number", "description", "sip_trunk", "inbound"];
export const V3_BODY_FIELDS = {
  agents: { create: AGENT_FIELDS, update: AGENT_FIELDS },
  secrets: { create: ["name", "secrets"], update: ["secrets"] },
  numbers: { create: NUMBER_FIELDS, update: NUMBER_FIELDS },
  campaigns: {
    create: [
      "name",
      "agent_id",
      "transport",
      "contacts",
      "lifecycle",
      "pacing",
      "schedule",
      "data_policy",
    ],
    update: ["lifecycle", "pacing", "schedule", "transport"],
  },
};

/** Require a JSON object whose keys are all documented for this write. */
export function validateV3Body(resource, op, body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new V3RouteError(400, "Invalid JSON body");
  }
  const allowed = V3_BODY_FIELDS[resource]?.[op] ?? [];
  const rejected = Object.keys(body).filter((key) => !allowed.includes(key));
  if (rejected.length > 0) {
    throw new V3RouteError(
      400,
      `Request body must not include: ${rejected.join(", ")}.`,
    );
  }
  return body;
}

/**
 * Resolve `/api/v3/{resource}[/{id}[/{action}]]` to an operation name.
 * Throws V3RouteError for unsupported resources or methods.
 */
export function resolveV3Operation(method, parts) {
  const [resource, id, action, ...extra] = parts;
  if (!resource || !V3_RESOURCES.has(resource)) {
    throw new V3RouteError(404, "Unsupported v3 resource.");
  }
  if (extra.length > 0) throw unknownEndpoint();

  if (!id) {
    if (method === "GET") return { resource, op: "list" };
    if (method === "POST" && resource !== "sessions") {
      return { resource, op: "create" };
    }
    throw methodNotAllowed();
  }

  if (action) {
    if (method !== "POST") throw methodNotAllowed();
    if (resource === "campaigns" && CAMPAIGN_ACTIONS.has(action)) {
      return { resource, id, op: action };
    }
    if (resource === "sessions" && action === "stop") {
      return { resource, id, op: "stop" };
    }
    throw unknownEndpoint();
  }

  if (method === "GET") return { resource, id, op: "get" };
  if (resource === "sessions") throw methodNotAllowed();
  if (method === "PATCH") return { resource, id, op: "update" };
  if (method === "DELETE") return { resource, id, op: "delete" };
  throw methodNotAllowed();
}

/**
 * Copy only the documented list query keys; integer keys are parsed.
 * @returns {Record<string, unknown>}
 */
export function listQuery(resource, searchParams) {
  /** @type {Record<string, unknown>} */
  const query = {};
  for (const key of LIST_QUERY_KEYS[resource] ?? []) {
    const value = searchParams.get(key);
    if (value === null || value === "") continue;
    if (INT_QUERY_KEYS.has(key)) {
      const parsed = Number(value);
      if (!Number.isInteger(parsed)) {
        throw new V3RouteError(400, `Query parameter ${key} must be an integer.`);
      }
      query[key] = parsed;
    } else {
      query[key] = value;
    }
  }
  return query;
}

function idKey(resource) {
  if (resource === "secrets") return "name";
  if (resource === "sessions") return "agentSessionId";
  return "id";
}

async function currentETag(api, ref) {
  const { rawResponse } = await api.get(ref).withRawResponse();
  const etag = rawResponse.headers.get("etag");
  if (!etag) {
    throw new V3RouteError(502, "Agora did not return an ETag for this resource.");
  }
  return etag;
}

/**
 * Execute a resolved operation against the SDK's low-level `client.v3`.
 * Conditional writes read the current ETag first (last write wins).
 */
export async function executeV3Operation(v3, operation, body, query = {}) {
  const { resource, id, op } = operation;
  const api = v3[resource];
  const ref = id === undefined ? {} : { [idKey(resource)]: id };
  const input =
    op === "create" || op === "update"
      ? validateV3Body(resource, op, body)
      : {};

  switch (op) {
    case "list":
      return api.list(query);
    case "create":
      return api.create(input);
    case "get":
      return api.get(ref);
    case "update":
      if (resource === "secrets") return api.update({ ...input, ...ref });
      return api.update({
        ...input,
        ...ref,
        ifMatch: await currentETag(api, ref),
      });
    case "delete":
      if (resource === "secrets") {
        return api.delete({ ...ref, ifMatch: await currentETag(api, ref) });
      }
      return api.delete(ref);
    case "stop":
      return api.stop(ref);
    default:
      return api[op](ref);
  }
}

/**
 * Map a thrown error to `{status, body}` using the SDK's error categories:
 * route errors keep their status; validation is 400; configuration is a 500
 * whose message is safe to show; a timeout is 504 and any other connection
 * failure 502; an API error keeps the upstream status, except a 2xx response
 * that violates the API contract, which is a 502; anything else is a logged
 * generic 500.
 */
export function v3ErrorResponse(error) {
  if (error instanceof V3RouteError) {
    return { status: error.status, body: { error: error.message } };
  }
  if (error instanceof V3ValidationError) {
    return { status: 400, body: { error: error.message } };
  }
  if (error instanceof V3ConfigurationError) {
    return { status: 500, body: { error: error.message } };
  }
  if (error instanceof V3TimeoutError) {
    return { status: 504, body: { error: "The Agora v3 API timed out." } };
  }
  if (error instanceof V3ConnectionError) {
    console.warn("[v3] connection error", error.cause ?? error);
    return { status: 502, body: { error: "Could not reach the Agora v3 API." } };
  }
  if (error instanceof V3Error) {
    const upstreamFailed = error.statusCode >= 400;
    return {
      status: upstreamFailed ? error.statusCode : 502,
      body: {
        error: upstreamFailed
          ? (error.detail ?? error.reason ?? "Agora v3 request failed.")
          : `Agora returned an invalid response: ${error.message}`,
        reason: error.reason ?? null,
        requestId: error.requestId ?? null,
        details: error.body ?? null,
      },
    };
  }
  console.error("[v3] unexpected error", error);
  return { status: 500, body: { error: "Internal server error." } };
}

export const CALL_INPUT_ERROR =
  "Expected an E.164 to number, a v3 agentId, and a registered phoneNumberId.";

/** Validate the `/api/call` body; returns null when invalid. */
export function parseCallInput(body) {
  const input = typeof body === "object" && body !== null ? body : {};
  const trimmed = (value) => (typeof value === "string" ? value.trim() : "");
  const to = trimmed(input.to);
  const agentId = trimmed(input.agentId);
  const phoneNumberId = trimmed(input.phoneNumberId);
  if (!to.startsWith("+") || !agentId || !phoneNumberId) return null;
  return { to, agentId, phoneNumberId };
}

/** Build the v3 session start request for an outbound PSTN test call. */
export function callSessionRequest({ to, agentId, phoneNumberId }) {
  return {
    agent_id: agentId,
    transport: { type: /** @type {const} */ ("telephony"), from: phoneNumberId, to },
    lifecycle: { idle_timeout_ms: 120_000, max_duration_ms: 300_000 },
    labels: { source: "quickstart", agent_id: agentId },
  };
}
