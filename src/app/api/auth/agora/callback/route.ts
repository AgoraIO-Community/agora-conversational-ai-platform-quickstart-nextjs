import { NextResponse } from "next/server";

import {
  authMode,
  consumeOAuthStateCookie,
  setSessionCookie,
  signSession,
} from "@/lib/auth";
import { exchangeCodeForToken, fetchCustomer } from "@/lib/agora-sso";
import { getAppPublicUrl } from "@/lib/env";

export const runtime = "nodejs";

/**
 * GET /api/auth/agora/callback?code=...&state=...
 */
export async function GET(request: Request) {
  if (authMode() === "bypass") {
    return redirectToHome(request);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const ssoError = url.searchParams.get("error");

  if (ssoError) {
    console.error(`[auth] SSO returned error=${ssoError}`);
    return redirectToHome(request, { authError: ssoError });
  }

  if (!code || !state) {
    return redirectToHome(request, { authError: "missing_params" });
  }

  const expectedState = await consumeOAuthStateCookie();
  if (!expectedState || expectedState !== state) {
    console.error("[auth] state mismatch on SSO callback");
    return redirectToHome(request, { authError: "state_mismatch" });
  }

  try {
    const token = await exchangeCodeForToken(code);
    const customer = await fetchCustomer(token.access_token);
    const sessionJwt = await signSession({
      id: customer.id,
      email: customer.email,
      name: customer.name,
    });
    await setSessionCookie(sessionJwt);
    return redirectToHome(request);
  } catch (err) {
    console.error("[auth] callback failed:", err);
    return redirectToHome(request, { authError: "exchange_failed" });
  }
}

function redirectToHome(
  request: Request,
  search?: Record<string, string>,
): NextResponse {
  const target = new URL("/", getAppPublicUrl(request.url));
  if (search) {
    for (const [key, value] of Object.entries(search)) {
      target.searchParams.set(key, value);
    }
  }
  return NextResponse.redirect(target);
}
