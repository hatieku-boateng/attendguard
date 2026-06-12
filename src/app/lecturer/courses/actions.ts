"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, count, eq, inArray } from "drizzle-orm";
import Papa from "papaparse";

import { getDb } from "@/db/client";
import {
  attendancePasskeys,
  attendanceRecords,
  attendanceSessions,
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

type CourseForEnrolment = {
  id: string;
  courseCode: string;
  courseTitle: string;
  programme: string | null;
  level: string | null;
  classGroup: string;
};

type StudentInput = {
  name: string;
  studentIdNumber: string;
  email: string;
  programme: string | null;
  level: string | null;
  classGroup: string | null;
};

async function enrolStudentWithActivation({
  db,
  course,
  student,
}: {
  db: ReturnType<typeof getDb>;
  course: CourseForEnrolment;
  student: StudentInput;
}) {
  const programme = student.programme || course.programme;
  const level = student.level || course.level;
  const classGroup = student.classGroup || course.classGroup;

  const [existingByEmail] = await db
    .select()
    .from(users)
    .where(eq(users.email, student.email))
    .limit(1);

  let studentProfileId: string | null = null;
  let studentUserId: string | null = null;
  let shouldSendActivation = false;

  if (existingByEmail) {
    if (existingByEmail.role !== "student") {
      return { ok: false, sent: false, emailSkipped: false };
    }

    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, existingByEmail.id))
      .limit(1);

    if (!profile || profile.studentIdNumber !== student.studentIdNumber) {
      return { ok: false, sent: false, emailSkipped: false };
    }

    studentProfileId = profile.id;
    studentUserId = existingByEmail.id;
    shouldSendActivation = existingByEmail.status === "pending";

    await db
      .update(studentProfiles)
      .set({
        programme: profile.programme || programme,
        level: profile.level || level,
        classGroup: profile.classGroup || classGroup,
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.id, profile.id));
  } else {
    const passwordHash = await hashPassword(randomBytes(18).toString("base64url"));
    const [createdUser] = await db
      .insert(users)
      .values({
        name: student.name,
        email: student.email,
        passwordHash,
        role: "student",
        status: "pending",
      })
      .returning({ id: users.id });

    const [profile] = await db
      .insert(studentProfiles)
      .values({
        userId: createdUser.id,
        studentIdNumber: student.studentIdNumber,
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
      courseId: course.id,
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

  let sent = false;
  let emailSkipped = false;

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
      to: student.email,
      studentName: student.name,
      courseLabel: `${course.courseCode}: ${course.courseTitle}`,
      activationUrl: getActivationUrl(token),
    });

    sent = emailResult.sent;
    emailSkipped = !emailResult.sent;
  }

  return { ok: true, sent, emailSkipped };
}

export async function importStudentsAction(formData: FormData) {
  const user = await requireRole("lecturer");
  const courseId = cleanString(formData.get("courseId"));
  const file = formData.get("studentFile");

  if (!user.lecturerProfileId || !courseId || !(file instanceof File)) {
    redirect("/lecturer/courses");
  }

  const db = getDb();
  const [course] = await db
    .select({
      id: courses.id,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
      programme: courses.programme,
      level: courses.level,
      classGroup: courses.classGroup,
    })
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

  for (const row of parsed.data) {
    const name = (getField(row, "student name") ?? "").toUpperCase();
    const studentIdNumber = (getField(row, "student id") ?? "").toUpperCase();
    const email = (getField(row, "email address") ?? "").toLowerCase();
    const programme = getField(row, "programme")?.toUpperCase() || null;
    const level = getField(row, "level")?.toUpperCase() || null;
    const classGroup = getField(row, "class group")?.toUpperCase() || null;

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

    const result = await enrolStudentWithActivation({
      db,
      course,
      student: { name, studentIdNumber, email, programme, level, classGroup },
    });

    if (!result.ok) {
      report.errors += 1;
      continue;
    }

    report.imported += 1;
    if (result.sent) report.activationEmailsSent += 1;
    if (result.emailSkipped) report.activationEmailsSkipped += 1;
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

export async function addStudentManuallyAction(formData: FormData) {
  const user = await requireRole("lecturer");
  const courseId = cleanString(formData.get("courseId"));
  const name = cleanString(formData.get("name")).toUpperCase();
  const studentIdNumber = cleanString(formData.get("studentIdNumber")).toUpperCase();
  const email = cleanString(formData.get("email")).toLowerCase();

  if (!user.lecturerProfileId || !courseId || !name || !studentIdNumber || !email) {
    redirect(`/lecturer/courses/${courseId}/students?manualError=invalid#manual-student`);
  }

  const db = getDb();
  const [course] = await db
    .select({
      id: courses.id,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
      programme: courses.programme,
      level: courses.level,
      classGroup: courses.classGroup,
    })
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

  const result = await enrolStudentWithActivation({
    db,
    course,
    student: {
      name,
      studentIdNumber,
      email,
      programme: cleanString(formData.get("programme")).toUpperCase() || null,
      level: cleanString(formData.get("level")).toUpperCase() || null,
      classGroup: cleanString(formData.get("classGroup")).toUpperCase() || null,
    },
  });

  if (!result.ok) {
    redirect(`/lecturer/courses/${courseId}/students?manualError=conflict#manual-student`);
  }

  await db.insert(auditLogs).values({
    userId: user.id,
    action: "student_manual_enrolment",
    entityType: "course",
    entityId: courseId,
    newValue: {
      email,
      studentIdNumber,
      activationEmailSent: result.sent,
      activationEmailSkipped: result.emailSkipped,
    },
  });

  revalidatePath(`/lecturer/courses/${courseId}/students`);
  redirect(
    `/lecturer/courses/${courseId}/students?manualAdded=1&sent=${
      result.sent ? 1 : 0
    }&pendingEmail=${result.emailSkipped ? 1 : 0}#manual-student`,
  );
}

export async function removeStudentFromCourseAction(formData: FormData) {
  const user = await requireRole("lecturer");
  const courseId = cleanString(formData.get("courseId"));
  const enrolmentId = cleanString(formData.get("enrolmentId"));

  if (!user.lecturerProfileId || !courseId || !enrolmentId) {
    redirect("/lecturer/courses");
  }

  const db = getDb();
  const [target] = await db
    .select({
      enrolmentId: enrolments.id,
      enrolmentStatus: enrolments.status,
      studentId: enrolments.studentId,
      studentName: users.name,
      studentEmail: users.email,
      studentIdNumber: studentProfiles.studentIdNumber,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
    })
    .from(enrolments)
    .innerJoin(courses, eq(enrolments.courseId, courses.id))
    .innerJoin(studentProfiles, eq(enrolments.studentId, studentProfiles.id))
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(
      and(
        eq(enrolments.id, enrolmentId),
        eq(enrolments.courseId, courseId),
        eq(courses.lecturerId, user.lecturerProfileId),
      ),
    )
    .limit(1);

  if (!target) {
    redirect("/lecturer/courses");
  }

  const courseSessions = await db
    .select({ id: attendanceSessions.id })
    .from(attendanceSessions)
    .where(eq(attendanceSessions.courseId, courseId));
  const sessionIds = courseSessions.map((session) => session.id);
  const [recordCount] = sessionIds.length
    ? await db
        .select({ value: count() })
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.studentId, target.studentId),
            inArray(attendanceRecords.sessionId, sessionIds),
          ),
        )
    : [{ value: 0 }];

  if (sessionIds.length > 0) {
    await db
      .delete(attendancePasskeys)
      .where(
        and(
          eq(attendancePasskeys.studentId, target.studentId),
          inArray(attendancePasskeys.sessionId, sessionIds),
        ),
      );
  }

  const removalMode = recordCount.value > 0 ? "withdrawn" : "deleted";

  if (removalMode === "withdrawn") {
    await db
      .update(enrolments)
      .set({ status: "withdrawn", updatedAt: new Date() })
      .where(eq(enrolments.id, target.enrolmentId));
  } else {
    await db.delete(enrolments).where(eq(enrolments.id, target.enrolmentId));
  }

  await db.insert(auditLogs).values({
    userId: user.id,
    action: "student_removed_from_course",
    entityType: "enrolment",
    entityId: target.enrolmentId,
    previousValue: {
      status: target.enrolmentStatus,
      studentName: target.studentName,
      studentEmail: target.studentEmail,
      studentIdNumber: target.studentIdNumber,
      courseCode: target.courseCode,
      courseTitle: target.courseTitle,
      attendanceRecords: recordCount.value,
    },
    newValue: {
      removalMode,
      passkeysRemoved: sessionIds.length > 0,
    },
  });

  revalidatePath(`/lecturer/courses/${courseId}/students`);
  revalidatePath(`/lecturer/courses/${courseId}`);
  revalidatePath("/lecturer/dashboard");
  revalidatePath("/student/classes");
  revalidatePath("/student/sessions");
  redirect(`/lecturer/courses/${courseId}/students?removed=${removalMode}`);
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
