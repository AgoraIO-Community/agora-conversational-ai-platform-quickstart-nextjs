import { V3ConfigurationError } from "agora-agents";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** True when both Console credentials are set, which enables the project picker. */
export function consoleConfigured(customerId, customerSecret) {
  return clean(customerId) !== "" && clean(customerSecret) !== "";
}

/**
 * Returns the App Certificate (`sign_key`) of the project whose App ID
 * (`vendor_key`) matches, from a Console `/dev/v1/projects` response body.
 */
export function projectCertificate(body, appId) {
  const projects = body && typeof body === "object" ? body.projects : undefined;
  if (!Array.isArray(projects)) return "";
  const project = projects.find(
    (item) => item && typeof item === "object" && item.vendor_key === appId,
  );
  return clean(project?.sign_key);
}

/**
 * Resolves the App ID and App Certificate that sign v3 requests.
 *
 * The configured project (AGORA_APP_ID) uses AGORA_APP_CERTIFICATE. A
 * different project chosen in the project picker uses its own certificate,
 * fetched server-side from Agora Console by `lookupCertificate`.
 */
export async function resolveAppCredentials({
  selectedAppId,
  appId,
  appCertificate,
  lookupCertificate,
}) {
  const configuredAppId = clean(appId);
  const target = clean(selectedAppId) || configuredAppId;
  if (!target) {
    throw new V3ConfigurationError(
      "Missing required environment variable: AGORA_APP_ID",
    );
  }
  if (target === configuredAppId) {
    const certificate = clean(appCertificate);
    if (!certificate) {
      throw new V3ConfigurationError(
        "Missing required environment variable: AGORA_APP_CERTIFICATE",
      );
    }
    return { appId: target, appCertificate: certificate };
  }
  const certificate = clean(await lookupCertificate(target));
  if (!certificate) {
    throw new V3ConfigurationError(
      `Project ${target} has no App Certificate. Enable the primary certificate in Agora Console.`,
    );
  }
  return { appId: target, appCertificate: certificate };
}
