/** Short prefix so logs are easy to grep: `rg pstn:` */

export function logPstnCall(
  level: "info" | "warn" | "error",
  message: string,
  details?: Record<string, unknown>,
) {
  const line = {
    scope: "pstn:call",
    level,
    message,
    ...details,
  };
  if (level === "error") {
    console.error(JSON.stringify(line));
  } else if (level === "warn") {
    console.warn(JSON.stringify(line));
  } else {
    console.log(JSON.stringify(line));
  }
}

export function logPstnWebhook(
  level: "info" | "warn" | "error",
  message: string,
  details?: Record<string, unknown>,
) {
  const line = {
    scope: "pstn:webhook",
    level,
    message,
    ...details,
  };
  if (level === "error") {
    console.error(JSON.stringify(line));
  } else if (level === "warn") {
    console.warn(JSON.stringify(line));
  } else {
    console.log(JSON.stringify(line));
  }
}

export function getRequestSourceDetails(req: Request) {
  const url = new URL(req.url);
  const sourceIpHeader = req.headers.get("x-forwarded-for");
  const sourceIp =
    sourceIpHeader?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    null;

  return {
    url: req.url,
    method: req.method,
    path: url.pathname,
    query: url.search || "",
    host: req.headers.get("host"),
    origin: req.headers.get("origin"),
    referer: req.headers.get("referer"),
    userAgent: req.headers.get("user-agent"),
    sourceIp,
    xForwardedFor: sourceIpHeader,
    xForwardedProto: req.headers.get("x-forwarded-proto"),
    xForwardedHost: req.headers.get("x-forwarded-host"),
    xForwardedPort: req.headers.get("x-forwarded-port"),
    xRealIp: req.headers.get("x-real-ip"),
    cfConnectingIp: req.headers.get("cf-connecting-ip"),
    // Vercel geo/network hints (if present)
    vercelId: req.headers.get("x-vercel-id"),
    vercelProxySignature: req.headers.get("x-vercel-proxy-signature"),
    vercelIpCountry: req.headers.get("x-vercel-ip-country"),
    vercelIpCountryRegion: req.headers.get("x-vercel-ip-country-region"),
    vercelIpCity: req.headers.get("x-vercel-ip-city"),
    vercelIpLatitude: req.headers.get("x-vercel-ip-latitude"),
    vercelIpLongitude: req.headers.get("x-vercel-ip-longitude"),
    vercelIpTimezone: req.headers.get("x-vercel-ip-timezone"),
    vercelIpAsNumber: req.headers.get("x-vercel-ip-as-number"),
    vercelIpAsOrganization: req.headers.get("x-vercel-ip-as-organization"),
    forwarded: req.headers.get("forwarded"),
  };
}

export function getRequestHeadersSnapshot(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of req.headers.entries()) {
    const key = k.toLowerCase();
    if (key === "authorization" || key === "cookie" || key === "set-cookie") {
      out[k] = "[redacted]";
      continue;
    }
    out[k] = v;
  }
  return out;
}

export function maskToken(token: string, head = 12): string {
  if (!token || token.length <= head) {
    return token ? `${token.slice(0, 4)}…` : "";
  }
  return `${token.slice(0, head)}…(${token.length} chars)`;
}
