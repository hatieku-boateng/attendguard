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

function cleanString(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function getDashboardPath(role: UserRole) {
  if (role === "administrator") {
    return "/admin/dashboard";
  }

  return role === "student" ? "/student/dashboard" : "/lecturer/dashboard";
}

export async function loginAction(formData: FormData) {
  const email = cleanString(formData.get("email")).toLowerCase();
  const password = cleanString(formData.get("password"));

  if (!email || !password) {
    redirect("/login?error=missing");
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
    redirect("/login?error=too-many");
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
    redirect("/login?error=invalid");
  }

  if (user.status !== "active") {
    await recordSecurityEvent({
      eventType: "login_failed",
      identifier: emailIdentifier,
      context: securityContext,
      metadata: { reason: "inactive_account" },
    });
    redirect("/login?error=inactive");
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
  const studentIdNumber = cleanString(formData.get("studentIdNumber"));
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
