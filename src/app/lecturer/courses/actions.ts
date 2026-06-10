"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import Papa from "papaparse";

import { getDb } from "@/db/client";
import {
  auditLogs,
  courses,
  enrolments,
  studentProfiles,
  users,
} from "@/db/schema";
import { hashPassword, requireRole } from "@/lib/auth";

function cleanString(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createCourseAction(formData: FormData) {
  const user = await requireRole(["lecturer", "administrator"]);

  if (!user.lecturerProfileId) {
    redirect("/lecturer/dashboard");
  }

  const courseCode = cleanString(formData.get("courseCode")).toUpperCase();
  const courseTitle = cleanString(formData.get("courseTitle"));
  const semester = cleanString(formData.get("semester"));
  const academicYear = cleanString(formData.get("academicYear"));

  if (!courseCode || !courseTitle || !semester || !academicYear) {
    redirect("/lecturer/courses/new?error=missing");
  }

  const db = getDb();
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
      lecturerId: user.lecturerProfileId,
      status: "active",
    })
    .returning({ id: courses.id });

  revalidatePath("/lecturer/courses");
  redirect(`/lecturer/courses/${course.id}`);
}

export async function updateCourseStatusAction(formData: FormData) {
  const user = await requireRole(["lecturer", "administrator"]);
  const courseId = cleanString(formData.get("courseId"));
  const status = cleanString(formData.get("status"));

  if (!user.lecturerProfileId || !courseId) {
    redirect("/lecturer/courses");
  }

  if (!["draft", "active", "archived"].includes(status)) {
    redirect(`/lecturer/courses/${courseId}`);
  }

  const db = getDb();

  await db
    .update(courses)
    .set({ status: status as "draft" | "active" | "archived", updatedAt: new Date() })
    .where(
      and(
        eq(courses.id, courseId),
        eq(courses.lecturerId, user.lecturerProfileId),
      ),
    );

  revalidatePath("/lecturer/courses");
  revalidatePath(`/lecturer/courses/${courseId}`);
}

type ImportRow = Record<string, string | undefined>;

const requiredImportFields = ["student name", "student id", "email address"];

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replaceAll("_", " ");
}

function getField(row: ImportRow, field: string) {
  return Object.entries(row).find(([key]) => normalizeHeader(key) === field)?.[1]?.trim();
}

function importReportUrl(courseId: string, report: ImportReport) {
  const params = new URLSearchParams({
    imported: String(report.imported),
    skipped: String(report.skipped),
    errors: String(report.errors),
  });

  return `/lecturer/courses/${courseId}/students?${params.toString()}#import-students`;
}

type ImportReport = {
  imported: number;
  skipped: number;
  errors: number;
};

export async function importStudentsAction(formData: FormData) {
  const user = await requireRole(["lecturer", "administrator"]);
  const courseId = cleanString(formData.get("courseId"));
  const file = formData.get("studentFile");

  if (!user.lecturerProfileId || !courseId || !(file instanceof File)) {
    redirect("/lecturer/courses");
  }

  const db = getDb();
  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(
      and(
        eq(courses.id, courseId),
        eq(courses.lecturerId, user.lecturerProfileId),
      ),
    )
    .limit(1);

  if (!course) {
    redirect("/lecturer/courses");
  }

  const csv = await file.text();
  const parsed = Papa.parse<ImportRow>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => normalizeHeader(header),
  });

  const headers = parsed.meta.fields ?? [];
  const hasRequiredHeaders = requiredImportFields.every((field) =>
    headers.includes(field),
  );

  if (!hasRequiredHeaders) {
    redirect(`/lecturer/courses/${courseId}/students?importError=headings#import-students`);
  }

  const report: ImportReport = { imported: 0, skipped: 0, errors: 0 };
  const seenEmails = new Set<string>();
  const seenStudentIds = new Set<string>();

  for (const row of parsed.data) {
    const name = getField(row, "student name") ?? "";
    const studentIdNumber = getField(row, "student id") ?? "";
    const email = (getField(row, "email address") ?? "").toLowerCase();
    const programme = getField(row, "programme") || null;
    const level = getField(row, "level") || null;
    const classGroup = getField(row, "class group") || null;

    if (!name || !studentIdNumber || !email) {
      report.errors += 1;
      continue;
    }

    if (seenEmails.has(email) || seenStudentIds.has(studentIdNumber)) {
      report.skipped += 1;
      continue;
    }

    seenEmails.add(email);
    seenStudentIds.add(studentIdNumber);

    const [existingByEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let studentProfileId: string | null = null;

    if (existingByEmail) {
      if (existingByEmail.role !== "student") {
        report.errors += 1;
        continue;
      }

      const [profile] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, existingByEmail.id))
        .limit(1);

      if (!profile || profile.studentIdNumber !== studentIdNumber) {
        report.errors += 1;
        continue;
      }

      studentProfileId = profile.id;
    } else {
      const passwordHash = await hashPassword(randomBytes(18).toString("base64url"));
      const [createdUser] = await db
        .insert(users)
        .values({
          name,
          email,
          passwordHash,
          role: "student",
          status: "pending",
        })
        .returning({ id: users.id });

      const [profile] = await db
        .insert(studentProfiles)
        .values({
          userId: createdUser.id,
          studentIdNumber,
          programme,
          level,
          classGroup,
        })
        .returning({ id: studentProfiles.id });

      studentProfileId = profile.id;
    }

    await db
      .insert(enrolments)
      .values({
        courseId,
        studentId: studentProfileId,
        status: "active",
      })
      .onConflictDoUpdate({
        target: [enrolments.courseId, enrolments.studentId],
        set: {
          status: "active",
          updatedAt: new Date(),
        },
      });

    report.imported += 1;
  }

  await db.insert(auditLogs).values({
    userId: user.id,
    action: "student_import",
    entityType: "course",
    entityId: courseId,
    newValue: report,
    reason: `Imported student CSV ${file.name}`,
  });

  revalidatePath(`/lecturer/courses/${courseId}/students`);
  redirect(importReportUrl(courseId, report));
}
