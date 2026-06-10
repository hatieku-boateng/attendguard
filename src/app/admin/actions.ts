"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { auditLogs, courses, lecturerProfiles, users } from "@/db/schema";
import { hashPassword, requireRole } from "@/lib/auth";

function cleanString(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createLecturerAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const name = cleanString(formData.get("name"));
  const email = cleanString(formData.get("email")).toLowerCase();
  const password = cleanString(formData.get("password"));

  if (!name || !email || password.length < 8) {
    redirect("/admin/lecturers/new?error=invalid");
  }

  const db = getDb();
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    redirect("/admin/lecturers/new?error=exists");
  }

  const [lecturerUser] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "lecturer",
      status: "active",
      emailVerifiedAt: new Date(),
    })
    .returning({ id: users.id });

  const [profile] = await db
    .insert(lecturerProfiles)
    .values({
      userId: lecturerUser.id,
      staffId: cleanString(formData.get("staffId")) || null,
      department: cleanString(formData.get("department")) || null,
    })
    .returning({ id: lecturerProfiles.id });

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "lecturer_created",
    entityType: "lecturer_profile",
    entityId: profile.id,
    newValue: { name, email },
  });

  revalidatePath("/admin/lecturers");
  redirect("/admin/lecturers");
}

export async function createAssignedCourseAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const lecturerId = cleanString(formData.get("lecturerId"));
  const courseCode = cleanString(formData.get("courseCode")).toUpperCase();
  const courseTitle = cleanString(formData.get("courseTitle"));
  const semester = cleanString(formData.get("semester"));
  const academicYear = cleanString(formData.get("academicYear"));

  if (!lecturerId || !courseCode || !courseTitle || !semester || !academicYear) {
    redirect("/admin/courses/new?error=missing");
  }

  const db = getDb();
  const [lecturer] = await db
    .select({ id: lecturerProfiles.id })
    .from(lecturerProfiles)
    .where(eq(lecturerProfiles.id, lecturerId))
    .limit(1);

  if (!lecturer) {
    redirect("/admin/courses/new?error=lecturer");
  }

  const [course] = await db
    .insert(courses)
    .values({
      courseCode,
      courseTitle,
      programme: cleanString(formData.get("programme")) || null,
      level: cleanString(formData.get("level")) || null,
      semester,
      academicYear,
      classGroup: cleanString(formData.get("classGroup")) || "main",
      lecturerId,
      status: "active",
    })
    .returning({ id: courses.id });

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "course_created_assigned",
    entityType: "course",
    entityId: course.id,
    newValue: { courseCode, courseTitle, lecturerId },
  });

  revalidatePath("/admin/courses");
  revalidatePath("/lecturer/courses");
  redirect("/admin/courses");
}
