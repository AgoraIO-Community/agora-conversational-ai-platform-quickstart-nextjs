import assert from "node:assert/strict";
import test from "node:test";

import {
  CALL_INPUT_ERROR,
  V3RouteError,
  callSessionRequest,
  executeV3Operation,
  listQuery,
  parseCallInput,
  resolveV3Operation,
  v3ErrorResponse,
  validateV3Body,
} from "../src/lib/v3-contract.mjs";
import {
  PreconditionFailedError,
  V3ConfigurationError,
  V3ConnectionError,
  V3Error,
  V3TimeoutError,
  V3ValidationError,
} from "agora-agents";

const rawResponse = (status, headers = {}) => ({
  status,
  statusText: "",
  url: "https://preview.ai.agora.io/",
  redirected: false,
  type: "basic",
  headers: new Headers(headers),
});

test("route table maps methods to v3 operations", () => {
  assert.deepEqual(resolveV3Operation("GET", ["agents"]), { resource: "agents", op: "list" });
  assert.deepEqual(resolveV3Operation("POST", ["numbers"]), { resource: "numbers", op: "create" });
  assert.deepEqual(resolveV3Operation("PATCH", ["campaigns", "c1"]), { resource: "campaigns", id: "c1", op: "update" });
  assert.deepEqual(resolveV3Operation("DELETE", ["secrets", "prod"]), { resource: "secrets", id: "prod", op: "delete" });
  assert.deepEqual(resolveV3Operation("POST", ["campaigns", "c1", "pause"]), { resource: "campaigns", id: "c1", op: "pause" });
  assert.deepEqual(resolveV3Operation("POST", ["sessions", "s1", "stop"]), { resource: "sessions", id: "s1", op: "stop" });
  assert.deepEqual(resolveV3Operation("GET", ["sessions", "s1"]), { resource: "sessions", id: "s1", op: "get" });
});

test("route table rejects unsupported resources and methods", () => {
  const status = (method, parts) => {
    try {
      resolveV3Operation(method, parts);
    } catch (error) {
      assert.ok(error instanceof V3RouteError);
      return error.status;
    }
    return 200;
  };
  assert.equal(status("GET", ["credentials"]), 404);
  assert.equal(status("GET", []), 404);
  assert.equal(status("POST", ["sessions"]), 405);
  assert.equal(status("PATCH", ["sessions", "s1"]), 405);
  assert.equal(status("DELETE", ["sessions", "s1"]), 405);
  assert.equal(status("GET", ["sessions", "s1", "stop"]), 405);
  assert.equal(status("POST", ["agents", "a1", "pause"]), 404);
  assert.throws(() => resolveV3Operation("POST", ["agents", "a1", "pause"]), /Unknown API endpoint/);
  assert.throws(() => resolveV3Operation("GET", ["agents", "a1", "x", "y"]), /Unknown API endpoint/);
  assert.equal(status("PUT", ["agents", "a1"]), 405);
});

test("list query keeps only documented keys and parses integers", () => {
  const params = new URLSearchParams("limit=10&cursor=abc&status=RUNNING,STOPPED&foo=bar&started_after=5");
  assert.deepEqual(listQuery("sessions", params), {
    limit: 10,
    cursor: "abc",
    status: "RUNNING,STOPPED",
    started_after: 5,
  });
  assert.deepEqual(listQuery("agents", params), { limit: 10, cursor: "abc" });
  assert.throws(() => listQuery("agents", new URLSearchParams("limit=x")), V3RouteError);
});

function fakeResource(calls, etag = '"v1"') {
  const record = (name) => (request) => {
    calls.push([name, request]);
    const promise = Promise.resolve({ ok: true });
    promise.withRawResponse = async () => ({
      data: { ok: true },
      rawResponse: { headers: new Headers({ etag }) },
    });
    return promise;
  };
  return Object.fromEntries(
    ["list", "create", "get", "update", "delete", "stop", "pause"].map((name) => [name, record(name)]),
  );
}

test("conditional writes read the current ETag first", async () => {
  const calls = [];
  const v3 = { agents: fakeResource(calls), secrets: fakeResource(calls) };
  await executeV3Operation(v3, { resource: "agents", id: "a1", op: "update" }, { agent_name: "x" });
  assert.deepEqual(calls, [
    ["get", { id: "a1" }],
    ["update", { agent_name: "x", id: "a1", ifMatch: '"v1"' }],
  ]);

  calls.length = 0;
  await executeV3Operation(v3, { resource: "secrets", id: "prod", op: "delete" });
  assert.deepEqual(calls, [
    ["get", { name: "prod" }],
    ["delete", { name: "prod", ifMatch: '"v1"' }],
  ]);

  calls.length = 0;
  await executeV3Operation(v3, { resource: "secrets", id: "prod", op: "update" }, { secrets: { k: null } });
  assert.deepEqual(calls, [["update", { secrets: { k: null }, name: "prod" }]]);
});

test("sessions use agentSessionId and stop without a body", async () => {
  const calls = [];
  const v3 = { sessions: fakeResource(calls) };
  await executeV3Operation(v3, { resource: "sessions", id: "s1", op: "stop" });
  assert.deepEqual(calls, [["stop", { agentSessionId: "s1" }]]);
});

test("errors map by SDK category to the shared response shape", () => {
  const body = { detail: "stale", reason: "PreconditionFailed" };
  const stale = new PreconditionFailedError(body, rawResponse(412, { "Agora-Request-Id": "r1" }), async () => ({}));
  assert.deepEqual(v3ErrorResponse(stale), {
    status: 412,
    body: { error: "stale", reason: "PreconditionFailed", requestId: "r1", details: body },
  });
  const missing = new V3Error(404, { reason: "AgentNotFound" }, rawResponse(404));
  assert.deepEqual(v3ErrorResponse(missing).body, {
    error: "AgentNotFound",
    reason: "AgentNotFound",
    requestId: null,
    details: { reason: "AgentNotFound" },
  });
  // A 2xx response that violates the API contract is the upstream's fault: 502, never a 2xx.
  const violation = new V3Error(200, "<html>", rawResponse(200, { "Agora-Request-Id": "r2" }), {
    message: "v3 response is not valid JSON (200)",
  });
  const mapped = v3ErrorResponse(violation);
  assert.equal(mapped.status, 502);
  assert.equal(mapped.body.requestId, "r2");
  assert.match(mapped.body.error, /invalid response/);

  assert.deepEqual(v3ErrorResponse(new V3ValidationError("bad uid")), { status: 400, body: { error: "bad uid" } });
  assert.deepEqual(v3ErrorResponse(new V3ConfigurationError("Missing AGORA_APP_ID")), {
    status: 500,
    body: { error: "Missing AGORA_APP_ID" },
  });
  assert.equal(v3ErrorResponse(new V3TimeoutError("timed out")).status, 504);
  const quiet = { warn: console.warn, error: console.error };
  console.warn = () => {};
  console.error = () => {};
  try {
    assert.equal(v3ErrorResponse(new V3ConnectionError("refused", { cause: new Error("ECONNREFUSED") })).status, 502);
    for (const unexpected of [new TypeError("x is undefined"), new Error("plain")]) {
      assert.deepEqual(v3ErrorResponse(unexpected), { status: 500, body: { error: "Internal server error." } });
    }
  } finally {
    Object.assign(console, quiet);
  }
  assert.deepEqual(v3ErrorResponse(new V3RouteError(405, "Method not allowed")), {
    status: 405,
    body: { error: "Method not allowed" },
  });
});

test("call input requires E.164 and v3 identifiers", () => {
  assert.equal(parseCallInput({ to: "15551234567", agentId: "a", phoneNumberId: "n" }), null);
  assert.equal(parseCallInput({ to: "+15551234567", agentId: "a", phoneNumberId: 42 }), null);
  assert.equal(parseCallInput(null), null);
  assert.ok(CALL_INPUT_ERROR.includes("v3 agentId"));
  const input = parseCallInput({ to: " +15551234567 ", agentId: "a", phoneNumberId: "n" });
  assert.deepEqual(callSessionRequest(input), {
    agent_id: "a",
    transport: { type: "telephony", from: "n", to: "+15551234567" },
    lifecycle: { idle_timeout_ms: 120000, max_duration_ms: 300000 },
    labels: { source: "quickstart", agent_id: "a" },
  });
});

test("bodies accept only documented fields, never server-owned SDK options", async () => {
  for (const key of ["appid", "id", "agentSessionId", "ifMatch", "ifNoneMatch", "idempotencyKey", "unknown_field"]) {
    assert.throws(
      () => validateV3Body("agents", "create", { agent_name: "x", [key]: "evil" }),
      (error) => error instanceof V3RouteError && error.status === 400 && error.message.includes(key),
    );
  }
  assert.throws(() => validateV3Body("agents", "create", []), (error) => error.status === 400);
  assert.throws(() => validateV3Body("agents", "create", null), (error) => error.status === 400);
  assert.throws(() => validateV3Body("secrets", "update", { name: "prod", secrets: {} }), (error) => error.status === 400);
  assert.deepEqual(validateV3Body("secrets", "create", { name: "prod", secrets: { k: "v" } }), { name: "prod", secrets: { k: "v" } });

  const calls = [];
  const v3 = { agents: fakeResource(calls) };
  await assert.rejects(
    executeV3Operation(v3, { resource: "agents", op: "create" }, { appid: "other-project" }),
    V3RouteError,
  );
  assert.equal(calls.length, 0);
});
