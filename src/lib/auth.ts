import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { auditLogs, lecturerProfiles, studentProfiles, users } from "@/db/schema";
import { getAuthSecret } from "@/lib/server-secret";

export { getAuthSecret } from "@/lib/server-secret";

export type UserRole = "administrator" | "lecturer" | "student";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  status: "pending" | "active" | "suspended" | "disabled";
  studentProfileId?: string;
  lecturerProfileId?: string;
};

const sessionCookieName = "ams_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 7;

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function createSessionToken(userId: string) {
  const payload = encodeBase64Url(
    JSON.stringify({
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds,
    }),
  );
  const signature = signPayload(payload);

  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string) {
  const [payload, signature] = token.split(".");

  if (!payload || !signature || !safeEqual(signature, signPayload(payload))) {
    return null;
  }

  try {
    const data = JSON.parse(decodeBase64Url(payload)) as {
      sub?: string;
      exp?: number;
    };

    if (!data.sub || !data.exp || data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return data.sub;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string) {
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.delete(sessionCookieName);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const userId = verifySessionToken(token);

  if (!userId) {
    return null;
  }

  const db = getDb();
  const [userData] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: users.role,
      status: users.status,
      studentProfileId: studentProfiles.id,
      lecturerProfileId: lecturerProfiles.id,
    })
    .from(users)
    .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .leftJoin(lecturerProfiles, eq(lecturerProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!userData) {
    return null;
  }

  return {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    avatarUrl: userData.avatarUrl,
    role: userData.role,
    status: userData.status,
    studentProfileId: userData.studentProfileId ?? undefined,
    lecturerProfileId: userData.lecturerProfileId ?? undefined,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.status !== "active") {
    redirect("/login?error=inactive");
  }

  return user;
}

function isProductionDeployment() {
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV === "production";
  }

  return process.env.NODE_ENV === "production";
}

function canUseDevBypass(user: CurrentUser) {
  const configuredEmail = process.env.DEV_BYPASS_EMAIL?.trim().toLowerCase();

  return (
    process.env.ENABLE_DEV_BYPASS === "true" &&
    !isProductionDeployment() &&
    user.role === "administrator" &&
    Boolean(configuredEmail) &&
    user.email.toLowerCase() === configuredEmail
  );
}

export async function requireRole(role: UserRole | UserRole[]) {
  const user = await requireUser();
  const allowedRoles = Array.isArray(role) ? role : [role];

  if (!allowedRoles.includes(user.role)) {
    if (canUseDevBypass(user)) {
      await getDb().insert(auditLogs).values({
        userId: user.id,
        action: "development_role_bypass",
        entityType: "auth",
        entityId: user.id,
        newValue: {
          requestedRoles: allowedRoles,
          actualRole: user.role,
          vercelEnv: process.env.VERCEL_ENV ?? null,
        },
        reason: "Authorized non-production development bypass.",
      });

      return user;
    }

    if (user.role === "student") {
      redirect("/student/dashboard");
    }

    if (user.role === "administrator") {
      redirect("/admin/dashboard");
    }

    redirect("/lecturer/dashboard");
  }

  return user;
}
