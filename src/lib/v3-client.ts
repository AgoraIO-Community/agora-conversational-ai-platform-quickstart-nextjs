import { NextResponse } from "next/server";
import { AgoraClient, Area, type V3Client } from "agora-agents";

import { resolveAppCredentials } from "@/lib/app-credentials.mjs";
import { getProjectAppId } from "@/lib/auth";
import { consoleEnabled, lookupProjectCertificate } from "@/lib/studio-api";
import { v3ErrorResponse } from "@/lib/v3-contract.mjs";

/**
 * Low-level v3 client for the selected project. Requests are signed with a
 * ConvoAI token the SDK generates from the App ID and App Certificate.
 * The SDK reads AGORA_AGENTS_V3_BASE_URL (default https://preview.ai.agora.io);
 * a blank value counts as unset.
 */
export async function getV3Client(): Promise<V3Client> {
  // The project picker needs Console credentials; without them, use AGORA_APP_ID.
  const selectedAppId = consoleEnabled() ? await getProjectAppId() : null;
  const credentials = await resolveAppCredentials({
    selectedAppId,
    appId: process.env.AGORA_APP_ID,
    appCertificate: process.env.AGORA_APP_CERTIFICATE,
    lookupCertificate: lookupProjectCertificate,
  });
  return new AgoraClient({ area: Area.US, ...credentials }).v3;
}

/** Translate SDK and route errors into the shared JSON error shape. */
export function v3ErrorJson(error: unknown): NextResponse {
  const { status, body } = v3ErrorResponse(error);
  return NextResponse.json(body, { status });
}
