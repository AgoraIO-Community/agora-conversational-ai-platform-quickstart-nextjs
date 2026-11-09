import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getRequestSourceDetails, logPstnCall } from "@/lib/route-log";
import { getV3Client, v3ErrorJson } from "@/lib/v3-client";
import {
  CALL_INPUT_ERROR,
  callSessionRequest,
  parseCallInput,
} from "@/lib/v3-contract.mjs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = parseCallInput(body);
  if (!input) {
    return NextResponse.json({ error: CALL_INPUT_ERROR }, { status: 400 });
  }

  logPstnCall("info", "v3_outbound_dial_start", {
    request: getRequestSourceDetails(req),
    agentId: input.agentId,
    phoneNumberId: input.phoneNumberId,
    to: input.to,
    userId: user.id,
  });

  let v3: Awaited<ReturnType<typeof getV3Client>>;
  try {
    v3 = await getV3Client();
  } catch (error) {
    logPstnCall("error", "v3_outbound_dial_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return v3ErrorJson(error);
  }

  try {
    const session = await v3.sessions.start(callSessionRequest(input));
    logPstnCall("info", "v3_outbound_dial_ok", {
      agentId: input.agentId,
      agentSessionId: session.agent_session_id,
      status: session.status,
    });
    return NextResponse.json({
      ok: true,
      agentSessionId: session.agent_session_id ?? null,
      status: session.status || "STARTING",
    });
  } catch (error) {
    const response = v3ErrorJson(error);
    logPstnCall("error", "v3_outbound_dial_failed", {
      agentId: input.agentId,
      phoneNumberId: input.phoneNumberId,
      upstreamStatus: response.status,
      error: error instanceof Error ? error.message : String(error),
    });
    return response;
  }
}

export async function GET(req: Request) {
  logPstnCall("warn", "method_not_allowed", {
    httpStatus: 405,
    request: getRequestSourceDetails(req),
  });
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
