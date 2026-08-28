"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import Papa from "papaparse";

import { getDb } from "@/db/client";
import {
  auditLogs,
  courseCatalog,
  courses,
  departments,
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
import { ensureAcademicYear } from "@/lib/institution-data";
import { normalizeProgrammeLevel, normalizeStudentCategory } from "@/lib/institution";

type ImportRow = Record<string, string | undefined>;

type CourseForEnrolment = {
  id: string;
  courseCode: string;
  courseTitle: string;
  programme: string | null;
  level: string | null;
  classGroup: string;
  academicYear: string;
  facultyId: string;
  departmentId: string;
  academicYearId: string | null;
};

type StudentInput = {
  name: string;
  studentIdNumber: string;
  email: string;
  programme: string | null;
  level: string | null;
  classGroup: string | null;
  studentCategory: "regular" | "weekend" | "access";
  programmeLevel: "diploma" | "undergraduate" | "postgraduate";
};

type ImportReport = {
  imported: number;
  skipped: number;
  errors: number;
  activationEmailsSent: number;
  activationEmailsSkipped: number;
};

const requiredImportFields = ["student name", "student id", "email address"];

function cleanString(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replaceAll("_", " ");
}

function getField(row: ImportRow, field: string) {
  return Object.entries(row).find(([key]) => normalizeHeader(key) === field)?.[1]?.trim();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function enrolmentUrl(params: Record<string, string | number>) {
  const search = new URLSearchParams({ modal: "enrol" });
  for (const [key, value] of Object.entries(params)) search.set(key, String(value));
  return `/admin/students?${search.toString()}`;
}

async function getCourseForEnrolment(courseId: string) {
  const [course] = await getDb()
    .select({
      id: courses.id,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
      programme: courses.programme,
      level: courses.level,
      classGroup: courses.classGroup,
      academicYear: courses.academicYear,
      facultyId: courseCatalog.facultyId,
      departmentId: courseCatalog.departmentId,
      academicYearId: courseCatalog.academicYearId,
    })
    .from(courses)
    .leftJoin(courseCatalog, eq(courses.catalogCourseId, courseCatalog.id))
    .where(
      and(
        eq(courses.id, courseId),
        eq(courses.status, "active"),
        eq(courseCatalog.status, "active"),
      ),
    )
    .limit(1);

  if (!course?.facultyId || !course.departmentId) return null;

  const [department] = await getDb()
    .select({ id: departments.id })
    .from(departments)
    .where(
      and(
        eq(departments.id, course.departmentId),
        eq(departments.facultyId, course.facultyId),
      ),
    )
    .limit(1);

  return department ? (course as CourseForEnrolment) : null;
}

async function enrolStudentWithActivation({
  course,
  student,
}: {
  course: CourseForEnrolment;
  student: StudentInput;
}) {
  const db = getDb();
  const programme = student.programme || course.programme;
  const level = student.level || course.level;
  const classGroup = student.classGroup || course.classGroup;
  const academicYear = course.academicYearId
    ? null
    : await ensureAcademicYear(course.academicYear);
  const academicYearId = course.academicYearId ?? academicYear?.id ?? null;

  const [existingByEmail, existingByStudentId] = await Promise.all([
    db.select().from(users).where(eq(users.email, student.email)).limit(1),
    db
      .select({
        id: studentProfiles.id,
        userId: studentProfiles.userId,
      })
      .from(studentProfiles)
      .where(eq(studentProfiles.studentIdNumber, student.studentIdNumber))
      .limit(1),
  ]);

  let studentProfileId: string;
  let studentUserId: string;
  let shouldSendActivation = false;

  if (existingByEmail[0]) {
    const existingUser = existingByEmail[0];
    if (existingUser.role !== "student") return { ok: false, sent: false, emailSkipped: false };

    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, existingUser.id))
      .limit(1);

    if (!profile || profile.studentIdNumber !== student.studentIdNumber) {
      return { ok: false, sent: false, emailSkipped: false };
    }

    studentProfileId = profile.id;
    studentUserId = existingUser.id;
    shouldSendActivation = existingUser.status === "pending";

    await db
      .update(studentProfiles)
      .set({
        programme: profile.programme || programme,
        level: profile.level || level,
        classGroup: profile.classGroup || classGroup,
        facultyId: profile.facultyId || course.facultyId,
        departmentId: profile.departmentId || course.departmentId,
        academicYearId: profile.academicYearId || academicYearId,
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.id, profile.id));
  } else {
    if (existingByStudentId[0]) return { ok: false, sent: false, emailSkipped: false };

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
        studentCategory: student.studentCategory,
        programmeLevel: student.programmeLevel,
        facultyId: course.facultyId,
        departmentId: course.departmentId,
        academicYearId,
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
    .values({ courseId: course.id, studentId: studentProfileId, status: "active" })
    .onConflictDoUpdate({
      target: [enrolments.courseId, enrolments.studentId],
      set: { status: "active", updatedAt: new Date() },
    });

  if (!shouldSendActivation) return { ok: true, sent: false, emailSkipped: false };

  const [existingLiveToken] = await db
    .select({ id: studentActivationTokens.id })
    .from(studentActivationTokens)
    .where(
      and(
        eq(studentActivationTokens.userId, studentUserId),
        isNull(studentActivationTokens.usedAt),
        gt(studentActivationTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (existingLiveToken) return { ok: true, sent: false, emailSkipped: true };

  const token = createActivationToken();
  await db
    .update(studentActivationTokens)
    .set({ usedAt: new Date() })
    .where(eq(studentActivationTokens.userId, studentUserId));
  await db.insert(studentActivationTokens).values({
    userId: studentUserId,
    tokenHash: hashActivationToken(token),
    expiresAt: getActivationExpiry(),
  });

  const emailResult = await sendStudentActivationEmail({
    to: student.email,
    studentName: student.name,
    courseLabel: `${course.courseCode}: ${course.courseTitle}`,
    activationUrl: getActivationUrl(token),
  });

  return { ok: true, sent: emailResult.sent, emailSkipped: !emailResult.sent };
}

export async function createStudentEnrolmentAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const courseId = cleanString(formData.get("courseId"));
  const name = cleanString(formData.get("name")).toUpperCase();
  const studentIdNumber = cleanString(formData.get("studentIdNumber")).toUpperCase();
  const email = cleanString(formData.get("email")).toLowerCase();
  const studentCategory = normalizeStudentCategory(cleanString(formData.get("studentCategory"))) ?? "regular";
  const programmeLevel = normalizeProgrammeLevel(cleanString(formData.get("programmeLevel"))) ?? "undergraduate";

  if (!courseId || !name || !studentIdNumber || !isEmail(email)) {
    redirect(enrolmentUrl({ enrolError: "invalid" }));
  }

  const course = await getCourseForEnrolment(courseId);
  if (!course) redirect(enrolmentUrl({ enrolError: "course" }));

  const result = await enrolStudentWithActivation({
    course,
    student: {
      name,
      studentIdNumber,
      email,
      programme: cleanString(formData.get("programme")).toUpperCase() || null,
      level: cleanString(formData.get("level")).toUpperCase() || null,
      classGroup: cleanString(formData.get("classGroup")).toUpperCase() || null,
      studentCategory,
      programmeLevel,
    },
  });

  if (!result.ok) redirect(enrolmentUrl({ enrolError: "conflict" }));

  await getDb().insert(auditLogs).values({
    userId: admin.id,
    action: "student_manual_enrolment",
    entityType: "course",
    entityId: courseId,
    newValue: { email, studentIdNumber, activationEmailSent: result.sent },
  });

  revalidatePath("/admin/students");
  revalidatePath(`/lecturer/courses/${courseId}/students`);
  redirect(enrolmentUrl({ enrolled: 1, sent: result.sent ? 1 : 0 }));
}

export async function importStudentEnrolmentsAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const courseId = cleanString(formData.get("courseId"));
  const file = formData.get("studentFile");

  if (!courseId || !(file instanceof File) || file.size > 2_000_000) {
    redirect(enrolmentUrl({ importError: "file" }));
  }

  const course = await getCourseForEnrolment(courseId);
  if (!course) redirect(enrolmentUrl({ importError: "course" }));

  const parsed = Papa.parse<ImportRow>(await file.text(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });
  const headers = parsed.meta.fields ?? [];

  if (!requiredImportFields.every((field) => headers.includes(field))) {
    redirect(enrolmentUrl({ importError: "headings" }));
  }

  if (parsed.data.length > 1000) redirect(enrolmentUrl({ importError: "rows" }));

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

    if (!name || !studentIdNumber || !isEmail(email)) {
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
      course,
      student: {
        name,
        studentIdNumber,
        email,
        programme: getField(row, "programme")?.toUpperCase() || null,
        level: getField(row, "level")?.toUpperCase() || null,
        classGroup: getField(row, "class group")?.toUpperCase() || null,
        studentCategory:
          normalizeStudentCategory(getField(row, "student category") ?? null) ?? "regular",
        programmeLevel:
          normalizeProgrammeLevel(getField(row, "programme level") ?? null) ?? "undergraduate",
      },
    });

    if (!result.ok) {
      report.errors += 1;
      continue;
    }
    report.imported += 1;
    if (result.sent) report.activationEmailsSent += 1;
    if (result.emailSkipped) report.activationEmailsSkipped += 1;
  }

  await getDb().insert(auditLogs).values({
    userId: admin.id,
    action: "student_import",
    entityType: "course",
    entityId: courseId,
    newValue: report,
    reason: `Imported student CSV ${file.name}`,
  });

  revalidatePath("/admin/students");
  revalidatePath(`/lecturer/courses/${courseId}/students`);
  redirect(
    enrolmentUrl({
      imported: report.imported,
      skipped: report.skipped,
      errors: report.errors,
      sent: report.activationEmailsSent,
      pendingEmail: report.activationEmailsSkipped,
    }),
  );
}
