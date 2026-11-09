import { NextResponse } from "next/server";
import { getRequestHeadersSnapshot, getRequestSourceDetails } from "@/lib/route-log";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ slug: string[] }> };

async function logUnknownApiRequest(req: Request, slug: string[]) {
  const rawBody = await req.text().catch(() => "");
  console.warn(
    JSON.stringify({
      scope: "pstn:api",
      level: "warn",
      message: "unknown_api_endpoint",
      request: getRequestSourceDetails(req),
      headers: getRequestHeadersSnapshot(req),
      endpoint: `/api/${slug.join("/")}`,
      rawBody,
    }),
  );
}

export async function POST(
  req: Request,
  context: RouteContext,
) {
  const { slug } = await context.params;
  await logUnknownApiRequest(req, slug);
  return NextResponse.json({ error: "Unknown API endpoint" }, { status: 404 });
}

export async function PUT(
  req: Request,
  context: RouteContext,
) {
  const { slug } = await context.params;
  await logUnknownApiRequest(req, slug);
  return NextResponse.json({ error: "Unknown API endpoint" }, { status: 404 });
}

export async function PATCH(
  req: Request,
  context: RouteContext,
) {
  const { slug } = await context.params;
  await logUnknownApiRequest(req, slug);
  return NextResponse.json({ error: "Unknown API endpoint" }, { status: 404 });
}

export async function DELETE(
  req: Request,
  context: RouteContext,
) {
  const { slug } = await context.params;
  await logUnknownApiRequest(req, slug);
  return NextResponse.json({ error: "Unknown API endpoint" }, { status: 404 });
}

export async function GET(
  req: Request,
  context: RouteContext,
) {
  const { slug } = await context.params;
  await logUnknownApiRequest(req, slug);
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
