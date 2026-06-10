"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import Papa from "papaparse";

import { getDb } from "@/db/client";
import {
  auditLogs,
  courseResources,
  courses,
  enrolments,
  studentActivationTokens,
  studentProfiles,
  users,
} from "@/db/schema";
import {
  createActivationToken,
  getActivationExpiry,
  getActivationUrl,
  hashActivationToken,
} from "@/lib/activation";
import { hashPassword, requireRole } from "@/lib/auth";
import { sendStudentActivationEmail } from "@/lib/email";

function cleanString(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createCourseAction() {
  await requireRole("administrator");
  redirect("/admin/courses/new");
}

export async function updateCourseStatusAction(formData: FormData) {
  const user = await requireRole("lecturer");
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
    sent: String(report.activationEmailsSent),
    pendingEmail: String(report.activationEmailsSkipped),
  });

  return `/lecturer/courses/${courseId}/students?${params.toString()}#import-students`;
}

type ImportReport = {
  imported: number;
  skipped: number;
  errors: number;
  activationEmailsSent: number;
  activationEmailsSkipped: number;
};

export async function importStudentsAction(formData: FormData) {
  const user = await requireRole("lecturer");
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

  const report: ImportReport = {
    imported: 0,
    skipped: 0,
    errors: 0,
    activationEmailsSent: 0,
    activationEmailsSkipped: 0,
  };
  const seenEmails = new Set<string>();
  const seenStudentIds = new Set<string>();

  const [courseDetails] = await db
    .select({
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
    })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

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
    let studentUserId: string | null = null;
    let shouldSendActivation = false;

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
      studentUserId = existingByEmail.id;
      shouldSendActivation = existingByEmail.status === "pending";
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
      studentUserId = createdUser.id;
      shouldSendActivation = true;
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

    if (shouldSendActivation && studentUserId) {
      const token = createActivationToken();
      const tokenHash = hashActivationToken(token);

      await db
        .update(studentActivationTokens)
        .set({ usedAt: new Date() })
        .where(eq(studentActivationTokens.userId, studentUserId));

      await db.insert(studentActivationTokens).values({
        userId: studentUserId,
        tokenHash,
        expiresAt: getActivationExpiry(),
      });

      const emailResult = await sendStudentActivationEmail({
        to: email,
        studentName: name,
        courseLabel: courseDetails
          ? `${courseDetails.courseCode}: ${courseDetails.courseTitle}`
          : "your course",
        activationUrl: getActivationUrl(token),
      });

      if (emailResult.sent) {
        report.activationEmailsSent += 1;
      } else {
        report.activationEmailsSkipped += 1;
      }
    }
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

export async function addCourseResourceAction(formData: FormData) {
  const user = await requireRole("lecturer");
  const courseId = cleanString(formData.get("courseId"));
  const title = cleanString(formData.get("title"));
  const resourceUrl = cleanString(formData.get("resourceUrl"));

  if (!user.lecturerProfileId || !courseId || !title || !resourceUrl) {
    redirect(`/lecturer/courses/${courseId}`);
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

  const [resource] = await db
    .insert(courseResources)
    .values({
      courseId,
      lecturerId: user.lecturerProfileId,
      title,
      resourceType: cleanString(formData.get("resourceType")) || "link",
      resourceUrl,
      description: cleanString(formData.get("description")) || null,
    })
    .returning({ id: courseResources.id });

  await db.insert(auditLogs).values({
    userId: user.id,
    action: "course_resource_created",
    entityType: "course_resource",
    entityId: resource.id,
    newValue: { courseId, title, resourceUrl },
  });

  revalidatePath(`/lecturer/courses/${courseId}`);
  revalidatePath("/student/classes");
  redirect(`/lecturer/courses/${courseId}#resources`);
}

export async function deleteCourseResourceAction(formData: FormData) {
  const user = await requireRole("lecturer");
  const courseId = cleanString(formData.get("courseId"));
  const resourceId = cleanString(formData.get("resourceId"));

  if (!user.lecturerProfileId || !courseId || !resourceId) {
    redirect("/lecturer/courses");
  }

  const db = getDb();
  await db
    .delete(courseResources)
    .where(
      and(
        eq(courseResources.id, resourceId),
        eq(courseResources.courseId, courseId),
        eq(courseResources.lecturerId, user.lecturerProfileId),
      ),
    );

  await db.insert(auditLogs).values({
    userId: user.id,
    action: "course_resource_deleted",
    entityType: "course_resource",
    entityId: resourceId,
  });

  revalidatePath(`/lecturer/courses/${courseId}`);
  revalidatePath("/student/classes");
  redirect(`/lecturer/courses/${courseId}#resources`);
}
