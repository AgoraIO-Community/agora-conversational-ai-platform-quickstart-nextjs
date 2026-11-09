import assert from "node:assert/strict";
import test from "node:test";

import { V3ConfigurationError } from "agora-agents";

import {
  consoleConfigured,
  projectCertificate,
  resolveAppCredentials,
} from "../src/lib/app-credentials.mjs";

const unused = async () => {
  throw new Error("Console lookup should not run");
};

test("the configured project signs with AGORA_APP_CERTIFICATE", async () => {
  assert.deepEqual(
    await resolveAppCredentials({
      selectedAppId: null,
      appId: " app-id ",
      appCertificate: " cert ",
      lookupCertificate: unused,
    }),
    { appId: "app-id", appCertificate: "cert" },
  );
});

test("missing App ID or certificate is a configuration error", async () => {
  await assert.rejects(
    resolveAppCredentials({ appId: "", appCertificate: "cert", lookupCertificate: unused }),
    (error) => error instanceof V3ConfigurationError && /AGORA_APP_ID/.test(error.message),
  );
  await assert.rejects(
    resolveAppCredentials({ appId: "app-id", appCertificate: " ", lookupCertificate: unused }),
    (error) =>
      error instanceof V3ConfigurationError && /AGORA_APP_CERTIFICATE/.test(error.message),
  );
});

test("a picker-selected project signs with its own Console certificate", async () => {
  const looked = [];
  const credentials = await resolveAppCredentials({
    selectedAppId: "other-app",
    appId: "app-id",
    appCertificate: "cert",
    lookupCertificate: async (appId) => {
      looked.push(appId);
      return "other-cert";
    },
  });
  assert.deepEqual(credentials, { appId: "other-app", appCertificate: "other-cert" });
  assert.deepEqual(looked, ["other-app"]);
  await assert.rejects(
    resolveAppCredentials({
      selectedAppId: "other-app",
      appId: "app-id",
      appCertificate: "cert",
      lookupCertificate: async () => "",
    }),
    (error) => error instanceof V3ConfigurationError && /other-app/.test(error.message),
  );
});

test("Console helpers", () => {
  assert.equal(consoleConfigured("id", "secret"), true);
  assert.equal(consoleConfigured("id", " "), false);
  const body = {
    projects: [
      { vendor_key: "a", sign_key: "cert-a" },
      { vendor_key: "b", sign_key: "" },
    ],
  };
  assert.equal(projectCertificate(body, "a"), "cert-a");
  assert.equal(projectCertificate(body, "b"), "");
  assert.equal(projectCertificate(body, "missing"), "");
  assert.equal(projectCertificate(null, "a"), "");
});
