import assert from "node:assert/strict";
import test from "node:test";

import {
  sanitizeAgoraProject,
  studioAuthorization,
} from "../src/lib/parity-contract.mjs";

test("Studio authorization is server-configured Basic auth", () => {
  assert.equal(
    studioAuthorization("customer", "secret"),
    `Basic ${Buffer.from("customer:secret").toString("base64")}`,
  );
  assert.throws(
    () => studioAuthorization("", "secret"),
    /Missing required environment variable: AGORA_CUSTOMER_ID/,
  );
});

test("project responses never expose the App Certificate", () => {
  const project = sanitizeAgoraProject({
    id: "project-id",
    name: "Example customer",
    vendor_key: "app-id",
    sign_key: "server-only-app-certificate",
    recording_server: "server-only",
    status: 1,
    created: 1_700_000_000,
  });
  assert.deepEqual(project, {
    id: "project-id",
    name: "Example customer",
    appId: "app-id",
    status: 1,
    created: 1_700_000_000,
  });
  assert.equal(JSON.stringify(project).includes("server-only"), false);
});
