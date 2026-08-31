"use server";

import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  auditLogs,
  studentActivationTokens,
  studentProfiles,
  users,
} from "@/db/schema";
import { hashActivationToken } from "@/lib/activation";
import {
  clearSessionCookie,
  hashPassword,
  setSessionCookie,
  verifyPassword,
  type UserRole,
} from "@/lib/auth";
import {
  getSecurityRequestContext,
  isSecurityRateLimited,
  recordSecurityEvent,
  securityWindows,
} from "@/lib/security";
import { getAdminLoginPath, isAdminAccessKey } from "@/lib/admin-access";

function cleanString(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function getDashboardPath(role: UserRole) {
  if (role === "administrator") {
    return "/admin/dashboard";
  }

  return role === "student" ? "/student/dashboard" : "/lecturer/dashboard";
}

function cleanRequestedRole(value: FormDataEntryValue | null) {
  const role = cleanString(value).toLowerCase();

  return ["lecturer", "student"].includes(role)
    ? (role as UserRole)
    : null;
}

function loginErrorUrl(basePath: string, error: string) {
  return `${basePath}?error=${error}`;
}

async function authenticateLogin({
  formData,
  requestedRole,
  errorBasePath,
  roleMismatchError = "role-mismatch",
}: {
  formData: FormData;
  requestedRole: UserRole;
  errorBasePath: string;
  roleMismatchError?: string;
}) {
  const email = cleanString(formData.get("email")).toLowerCase();
  const password = cleanString(formData.get("password"));

  if (!email || !password) {
    redirect(loginErrorUrl(errorBasePath, "missing"));
  }

  const securityContext = await getSecurityRequestContext();
  const ipIdentifier = `login-ip:${securityContext.ipAddress ?? "unknown"}`;
  const emailIdentifier = `login-email:${email}`;
  const [emailBlocked, ipBlocked] = await Promise.all([
    isSecurityRateLimited({
      eventType: "login_failed",
      identifier: emailIdentifier,
      limit: 8,
      windowMs: securityWindows.standard,
    }),
    isSecurityRateLimited({
      eventType: "login_failed",
      identifier: ipIdentifier,
      limit: 30,
      windowMs: securityWindows.standard,
    }),
  ]);

  if (emailBlocked || ipBlocked) {
    await recordSecurityEvent({
      eventType: "login_blocked",
      identifier: emailBlocked ? emailIdentifier : ipIdentifier,
      context: securityContext,
      metadata: { emailBlocked, ipBlocked },
    });
    redirect(loginErrorUrl(errorBasePath, "too-many"));
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await Promise.all([
      recordSecurityEvent({
        eventType: "login_failed",
        identifier: emailIdentifier,
        context: securityContext,
        metadata: { reason: "invalid_credentials" },
      }),
      recordSecurityEvent({
        eventType: "login_failed",
        identifier: ipIdentifier,
        context: securityContext,
        metadata: { reason: "invalid_credentials" },
      }),
    ]);
    redirect(loginErrorUrl(errorBasePath, "invalid"));
  }

  if (user.status !== "active") {
    await recordSecurityEvent({
      eventType: "login_failed",
      identifier: emailIdentifier,
      context: securityContext,
      metadata: { reason: "inactive_account" },
    });
    redirect(loginErrorUrl(errorBasePath, "inactive"));
  }

  if (user.role !== requestedRole) {
    await recordSecurityEvent({
      eventType: "login_failed",
      identifier: emailIdentifier,
      context: securityContext,
      metadata: {
        reason: "role_mismatch",
        requestedRole,
        actualRole: user.role,
      },
    });
    redirect(loginErrorUrl(errorBasePath, roleMismatchError));
  }

  await recordSecurityEvent({
    eventType: "login_success",
    identifier: `user:${user.id}`,
    context: securityContext,
    success: true,
    metadata: { role: user.role },
  });
  await setSessionCookie(user.id);
  redirect(getDashboardPath(user.role));
}

export async function loginAction(formData: FormData) {
  const requestedRole = cleanRequestedRole(formData.get("role"));

  if (!requestedRole) {
    redirect("/login?error=missing");
  }

  return authenticateLogin({
    formData,
    requestedRole,
    errorBasePath: "/login",
  });
}

export async function adminLoginAction(formData: FormData) {
  const accessKey = cleanString(formData.get("accessKey"));
  const errorBasePath = getAdminLoginPath();

  if (!errorBasePath || !isAdminAccessKey(accessKey)) {
    redirect("/login");
  }

  return authenticateLogin({
    formData,
    requestedRole: "administrator",
    errorBasePath,
    roleMismatchError: "invalid",
  });
}

export async function registerAction(formData: FormData) {
  void formData;
  redirect("/login");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function activateAccountAction(formData: FormData) {
  const token = cleanString(formData.get("token"));
  const studentIdNumber = cleanString(formData.get("studentIdNumber")).toUpperCase();
  const password = cleanString(formData.get("password"));

  if (!token || !studentIdNumber || password.length < 8) {
    redirect("/activate-account?error=invalid");
  }

  const securityContext = await getSecurityRequestContext();
  const ipIdentifier = `activation-ip:${securityContext.ipAddress ?? "unknown"}`;
  const studentIdentifier = `activation-student:${studentIdNumber}`;
  const [ipBlocked, studentBlocked] = await Promise.all([
    isSecurityRateLimited({
      eventType: "activation_failed",
      identifier: ipIdentifier,
      limit: 20,
      windowMs: securityWindows.standard,
    }),
    isSecurityRateLimited({
      eventType: "activation_failed",
      identifier: studentIdentifier,
      limit: 8,
      windowMs: securityWindows.standard,
    }),
  ]);

  if (ipBlocked || studentBlocked) {
    await recordSecurityEvent({
      eventType: "activation_blocked",
      identifier: ipBlocked ? ipIdentifier : studentIdentifier,
      context: securityContext,
      metadata: { ipBlocked, studentBlocked },
    });
    redirect("/activate-account?error=too-many");
  }

  const tokenHash = hashActivationToken(token);
  const db = getDb();
  const [match] = await db
    .select({
      userId: users.id,
      status: users.status,
      tokenId: studentActivationTokens.id,
    })
    .from(studentActivationTokens)
    .innerJoin(users, eq(studentActivationTokens.userId, users.id))
    .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .where(
      and(
        eq(studentActivationTokens.tokenHash, tokenHash),
        isNull(studentActivationTokens.usedAt),
        gt(studentActivationTokens.expiresAt, new Date()),
        eq(users.role, "student"),
        eq(studentProfiles.studentIdNumber, studentIdNumber),
      ),
    )
    .limit(1);

  if (!match) {
    await Promise.all([
      recordSecurityEvent({
        eventType: "activation_failed",
        identifier: ipIdentifier,
        context: securityContext,
        metadata: { reason: "invalid_token_or_student_id" },
      }),
      recordSecurityEvent({
        eventType: "activation_failed",
        identifier: studentIdentifier,
        context: securityContext,
        metadata: { reason: "invalid_token_or_student_id" },
      }),
    ]);
    redirect("/activate-account?error=invalid-token");
  }

  if (match.status === "active") {
    redirect("/login?error=already-active");
  }

  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(password),
      status: "active",
      emailVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, match.userId));

  await db
    .update(studentActivationTokens)
    .set({ usedAt: new Date() })
    .where(eq(studentActivationTokens.id, match.tokenId));

  await db.insert(auditLogs).values({
    userId: match.userId,
    action: "student_account_activated",
    entityType: "user",
    entityId: match.userId,
  });

  await recordSecurityEvent({
    eventType: "activation_success",
    identifier: `user:${match.userId}`,
    context: securityContext,
    success: true,
  });
  await setSessionCookie(match.userId);
  redirect("/student/dashboard");
}
