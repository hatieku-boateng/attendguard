import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

export type IntegrationContext = {
  sourceSystem: string;
};

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export function requireIntegrationRequest(request: NextRequest):
  | { ok: true; context: IntegrationContext }
  | { ok: false; response: NextResponse } {
  const secret = process.env.INTEGRATION_API_SECRET;

  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Integration API is not configured." },
        { status: 503 },
      ),
    };
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token || !safeEqual(token, secret)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized integration request." }, { status: 401 }),
    };
  }

  const sourceSystem =
    request.headers.get("x-source-system")?.trim().toLowerCase() || "external_sis";

  return { ok: true, context: { sourceSystem } };
}
