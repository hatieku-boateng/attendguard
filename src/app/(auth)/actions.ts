"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { lecturerProfiles, studentProfiles, users } from "@/db/schema";
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
  const name = cleanString(formData.get("name"));
  const email = cleanString(formData.get("email")).toLowerCase();
  const password = cleanString(formData.get("password"));
  const role = cleanString(formData.get("role")) as UserRole;

  if (!name || !email || password.length < 8) {
    redirect("/register?error=invalid");
  }

  if (!["lecturer", "student"].includes(role)) {
    redirect("/register?error=role");
  }

  const studentIdNumber = cleanString(formData.get("studentIdNumber"));

  if (role === "student" && !studentIdNumber) {
    redirect("/register?error=student-id");
  }

  const db = getDb();
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    redirect("/register?error=exists");
  }

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash,
      role,
      status: "active",
      emailVerifiedAt: new Date(),
    })
    .returning();

  if (role === "student") {
    await db.insert(studentProfiles).values({
      userId: user.id,
      studentIdNumber,
      programme: cleanString(formData.get("programme")) || null,
      level: cleanString(formData.get("level")) || null,
      classGroup: cleanString(formData.get("classGroup")) || null,
    });
  } else {
    await db.insert(lecturerProfiles).values({
      userId: user.id,
      staffId: cleanString(formData.get("staffId")) || null,
      department: cleanString(formData.get("department")) || null,
    });
  }

  await setSessionCookie(user.id);
  redirect(getDashboardPath(role));
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function activateAccountAction(formData: FormData) {
  const email = cleanString(formData.get("email")).toLowerCase();
  const studentIdNumber = cleanString(formData.get("studentIdNumber"));
  const password = cleanString(formData.get("password"));

  if (!email || !studentIdNumber || password.length < 8) {
    redirect("/activate-account?error=invalid");
  }

  const db = getDb();
  const [match] = await db
    .select({
      userId: users.id,
      status: users.status,
      studentProfileId: studentProfiles.id,
    })
    .from(users)
    .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .where(
      and(
        eq(users.email, email),
        eq(users.role, "student"),
        eq(studentProfiles.studentIdNumber, studentIdNumber),
      ),
    )
    .limit(1);

  if (!match) {
    redirect("/activate-account?error=not-found");
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

  await setSessionCookie(match.userId);
  redirect("/student/dashboard");
}
