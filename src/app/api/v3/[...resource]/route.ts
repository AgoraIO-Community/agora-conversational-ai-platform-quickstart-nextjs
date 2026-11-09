import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getV3Client, v3ErrorJson } from "@/lib/v3-client";
import {
  executeV3Operation,
  listQuery,
  resolveV3Operation,
  validateV3Body,
} from "@/lib/v3-contract.mjs";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ resource: string[] }>;
};

async function handle(req: Request, context: RouteContext) {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let operation: ReturnType<typeof resolveV3Operation>;
  let query: Record<string, unknown> = {};
  let body: unknown = undefined;
  try {
    const { resource } = await context.params;
    operation = resolveV3Operation(req.method, resource);
    if (operation.op === "list") {
      query = listQuery(operation.resource, new URL(req.url).searchParams);
    }
    if (operation.op === "create" || operation.op === "update") {
      body = validateV3Body(
        operation.resource,
        operation.op,
        await req.json().catch(() => null),
      );
    }
  } catch (error) {
    return v3ErrorJson(error);
  }

  let v3: Awaited<ReturnType<typeof getV3Client>>;
  try {
    v3 = await getV3Client();
  } catch (error) {
    return v3ErrorJson(error);
  }

  try {
    const data = await executeV3Operation(v3, operation, body, query);
    return NextResponse.json(data ?? null);
  } catch (error) {
    return v3ErrorJson(error);
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
