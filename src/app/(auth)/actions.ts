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

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect("/login?error=invalid");
  }

  if (user.status !== "active") {
    redirect("/login?error=inactive");
  }

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

  await setSessionCookie(match.userId);
  redirect("/student/dashboard");
}
