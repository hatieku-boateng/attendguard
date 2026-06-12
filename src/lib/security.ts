import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { and, count, eq, gt } from "drizzle-orm";

import { getDb } from "@/db/client";
import { securityEvents } from "@/db/schema";
import { getAuthSecret } from "@/lib/auth";

export type SecurityRequestContext = {
  ipAddress: string | null;
  userAgent: string | null;
};

export const securityWindows = {
  short: 5 * 60 * 1000,
  standard: 15 * 60 * 1000,
  extended: 60 * 60 * 1000,
};

function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase() || "anonymous";
}

export function hashSecurityIdentifier(identifier: string) {
  return createHmac("sha256", getAuthSecret())
    .update(normalizeIdentifier(identifier))
    .digest("hex");
}

export async function getSecurityRequestContext(): Promise<SecurityRequestContext> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    headerStore.get("cf-connecting-ip") ||
    null;

  return {
    ipAddress,
    userAgent: headerStore.get("user-agent"),
  };
}

export async function recordSecurityEvent({
  eventType,
  identifier,
  context,
  success = false,
  metadata,
}: {
  eventType: string;
  identifier: string;
  context?: SecurityRequestContext;
  success?: boolean;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  const requestContext = context ?? (await getSecurityRequestContext());

  await db.insert(securityEvents).values({
    eventType,
    identifierHash: hashSecurityIdentifier(identifier),
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    success,
    metadata: metadata ?? null,
  });
}

export async function getRecentSecurityEventCount({
  eventType,
  identifier,
  windowMs,
}: {
  eventType: string;
  identifier: string;
  windowMs: number;
}) {
  const db = getDb();
  const since = new Date(Date.now() - windowMs);
  const [row] = await db
    .select({ value: count() })
    .from(securityEvents)
    .where(
      and(
        eq(securityEvents.eventType, eventType),
        eq(securityEvents.identifierHash, hashSecurityIdentifier(identifier)),
        gt(securityEvents.createdAt, since),
      ),
    );

  return row.value;
}

export async function isSecurityRateLimited({
  eventType,
  identifier,
  limit,
  windowMs,
}: {
  eventType: string;
  identifier: string;
  limit: number;
  windowMs: number;
}) {
  const recentCount = await getRecentSecurityEventCount({
    eventType,
    identifier,
    windowMs,
  });

  return recentCount >= limit;
}
