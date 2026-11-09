import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Agora SSO may whitelist only the site root (for example https://your-app.example).
 * OAuth then lands on /?code=...&state=... — forward to our real callback route.
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isOAuthCallback =
    (searchParams.has("code") && searchParams.has("state")) ||
    searchParams.has("error");
  if (pathname === "/" && isOAuthCallback) {
    const url = request.nextUrl.clone();
    url.pathname = "/api/auth/agora/callback";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
