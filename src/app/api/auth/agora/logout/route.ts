import { NextResponse } from "next/server";

import { authMode, clearSessionCookie } from "@/lib/auth";
import { buildLogoutUrl } from "@/lib/agora-sso";
import { getAppPublicUrl } from "@/lib/env";

export const runtime = "nodejs";

/**
 * POST /api/auth/agora/logout  -> JSON { redirect: string }
 * GET  /api/auth/agora/logout  -> 302 to the redirect
 */
export async function POST(request: Request) {
  await clearSessionCookie();
  const redirect = logoutTarget(request);
  return NextResponse.json({ redirect });
}

export async function GET(request: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(logoutTarget(request));
}

function logoutTarget(request: Request): string {
  const home = new URL("/", getAppPublicUrl(request.url)).toString();
  if (authMode() === "bypass") return home;
  try {
    return buildLogoutUrl(home);
  } catch (err) {
    console.error("[auth] could not build SSO logout URL:", err);
    return home;
  }
}
