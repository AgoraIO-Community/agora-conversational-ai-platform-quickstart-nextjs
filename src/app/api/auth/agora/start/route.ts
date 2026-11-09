import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import {
  authMode,
  setOAuthStateCookie,
} from "@/lib/auth";
import { buildAuthorizeUrl } from "@/lib/agora-sso";
import { getAppPublicUrl } from "@/lib/env";

export const runtime = "nodejs";

/**
 * GET /api/auth/agora/start
 *
 * SSO mode: redirect to Agora authorize. Bypass mode: redirect home.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = sanitizeReturnTo(url.searchParams.get("returnTo"));

  if (authMode() === "bypass") {
    return NextResponse.redirect(new URL(returnTo, getAppPublicUrl(request.url)));
  }

  try {
    const state = randomUUID();
    await setOAuthStateCookie(state);
    const authorizeUrl = buildAuthorizeUrl(state);
    return NextResponse.redirect(authorizeUrl);
  } catch (err) {
    console.error("[auth] /start failed:", err);
    const message = err instanceof Error ? err.message : "SSO start failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function sanitizeReturnTo(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}
