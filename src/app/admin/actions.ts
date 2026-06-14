"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, count, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  attendancePasskeys,
  attendanceRecords,
  attendanceSessions,
  auditLogs,
  courseCatalog,
  courses,
  enrolments,
  lecturerProfiles,
  studentProfiles,
  users,
} from "@/db/schema";
import { hashPassword, requireRole } from "@/lib/auth";
import { cleanString, fileToDataUrl } from "@/lib/form-utils";

const enrolmentStatuses = ["active", "withdrawn", "completed"] as const;
const studentAccountStatuses = ["pending", "active", "suspended", "disabled"] as const;
type AdminDb = ReturnType<typeof getDb>;

function cleanId(value: FormDataEntryValue | null) {
  return cleanString(value, { uppercase: false });
}

function cleanIds(formData: FormData) {
  return Array.from(new Set(formData.getAll("enrolmentId").map(cleanId).filter(Boolean)));
}

function cleanStudentIds(formData: FormData) {
  return Array.from(new Set(formData.getAll("studentId").map(cleanId).filter(Boolean)));
}

function cleanEnrolmentStatus(value: FormDataEntryValue | null) {
  const status = cleanString(value, { uppercase: false });

  return enrolmentStatuses.includes(status as (typeof enrolmentStatuses)[number])
    ? (status as (typeof enrolmentStatuses)[number])
    : null;
}

function cleanStudentAccountStatus(value: FormDataEntryValue | null) {
  const status = cleanString(value, { uppercase: false });

  return studentAccountStatuses.includes(status as (typeof studentAccountStatuses)[number])
    ? (status as (typeof studentAccountStatuses)[number])
    : null;
}

function revalidateEnrolmentViews(courseId?: string, enrolmentId?: string) {
  revalidatePath("/admin/students");
  revalidatePath("/admin/dashboard");
  revalidatePath("/lecturer/dashboard");
  revalidatePath("/lecturer/courses");
  revalidatePath("/student/classes");
  revalidatePath("/student/sessions");

  if (courseId) {
    revalidatePath(`/lecturer/courses/${courseId}`);
    revalidatePath(`/lecturer/courses/${courseId}/students`);
  }

  if (enrolmentId) {
    revalidatePath(`/admin/students/${enrolmentId}/edit`);
  }
}

async function getCourseSessionIds(db: AdminDb, courseId: string) {
  const sessions = await db
    .select({ id: attendanceSessions.id })
    .from(attendanceSessions)
    .where(eq(attendanceSessions.courseId, courseId));

  return sessions.map((session: { id: string }) => session.id);
}

async function countCourseAttendanceRecords(
  db: AdminDb,
  courseId: string,
  studentId: string,
) {
  const sessionIds = await getCourseSessionIds(db, courseId);

  if (sessionIds.length === 0) {
    return 0;
  }

  const [recordCount] = await db
    .select({ value: count() })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.studentId, studentId),
        inArray(attendanceRecords.sessionId, sessionIds),
      ),
    );

  return recordCount?.value ?? 0;
}

async function removeAttendancePasskeysForTargets(
  db: AdminDb,
  targets: Array<{ courseId: string; studentId: string }>,
) {
  const courseIds = Array.from(new Set(targets.map((target) => target.courseId)));

  if (courseIds.length === 0) {
    return;
  }

  const sessions = await db
    .select({ id: attendanceSessions.id, courseId: attendanceSessions.courseId })
    .from(attendanceSessions)
    .where(inArray(attendanceSessions.courseId, courseIds));
  const sessionIdsByCourse = new Map<string, string[]>();

  for (const session of sessions) {
    const courseSessionIds = sessionIdsByCourse.get(session.courseId) ?? [];
    courseSessionIds.push(session.id);
    sessionIdsByCourse.set(session.courseId, courseSessionIds);
  }

  for (const target of targets) {
    const sessionIds = sessionIdsByCourse.get(target.courseId) ?? [];

    if (sessionIds.length === 0) {
      continue;
    }

    await db
      .delete(attendancePasskeys)
      .where(
        and(
          eq(attendancePasskeys.studentId, target.studentId),
          inArray(attendancePasskeys.sessionId, sessionIds),
        ),
      );
  }
}

export async function createLecturerAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const name = cleanString(formData.get("name"));
  const email = cleanString(formData.get("email"), { uppercase: false }).toLowerCase();
  const password = cleanString(formData.get("password"), { uppercase: false });

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

  const avatarUrl = await fileToDataUrl(formData.get("avatar"));

  if (avatarUrl === "invalid") {
    redirect("/admin/lecturers/new?error=image");
  }

  const [lecturerUser] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: await hashPassword(password),
      avatarUrl,
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

export async function updateLecturerAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const lecturerId = cleanString(formData.get("lecturerId"), { uppercase: false });
  const name = cleanString(formData.get("name"));
  const email = cleanString(formData.get("email"), { uppercase: false }).toLowerCase();

  if (!lecturerId || !name || !email) {
    redirect(`/admin/lecturers/${lecturerId}/edit?error=invalid`);
  }

  const avatarUrl = await fileToDataUrl(formData.get("avatar"));

  if (avatarUrl === "invalid") {
    redirect(`/admin/lecturers/${lecturerId}/edit?error=image`);
  }

  const db = getDb();
  const [lecturer] = await db
    .select({ userId: lecturerProfiles.userId })
    .from(lecturerProfiles)
    .where(eq(lecturerProfiles.id, lecturerId))
    .limit(1);

  if (!lecturer) {
    redirect("/admin/lecturers");
  }

  await db
    .update(users)
    .set({
      name,
      email,
      ...(avatarUrl ? { avatarUrl } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, lecturer.userId));

  await db
    .update(lecturerProfiles)
    .set({
      staffId: cleanString(formData.get("staffId")) || null,
      department: cleanString(formData.get("department")) || null,
      updatedAt: new Date(),
    })
    .where(eq(lecturerProfiles.id, lecturerId));

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "lecturer_updated",
    entityType: "lecturer_profile",
    entityId: lecturerId,
    newValue: { name, email },
  });

  revalidatePath("/admin/lecturers");
  redirect("/admin/lecturers");
}

export async function deleteLecturerAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const lecturerId = cleanString(formData.get("lecturerId"), { uppercase: false });

  if (!lecturerId) {
    redirect("/admin/lecturers");
  }

  const db = getDb();
  const [assignedCourse] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.lecturerId, lecturerId))
    .limit(1);

  if (assignedCourse) {
    redirect(`/admin/lecturers/${lecturerId}/edit?error=assigned`);
  }

  const [lecturer] = await db
    .select({ userId: lecturerProfiles.userId })
    .from(lecturerProfiles)
    .where(eq(lecturerProfiles.id, lecturerId))
    .limit(1);

  if (lecturer) {
    await db.delete(users).where(eq(users.id, lecturer.userId));
    await db.insert(auditLogs).values({
      userId: admin.id,
      action: "lecturer_deleted",
      entityType: "lecturer_profile",
      entityId: lecturerId,
    });
  }

  revalidatePath("/admin/lecturers");
  redirect("/admin/lecturers");
}

export async function createCatalogCourseAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const courseCode = cleanString(formData.get("courseCode")).toUpperCase();
  const courseTitle = cleanString(formData.get("courseTitle"));

  if (!courseCode || !courseTitle) {
    redirect("/admin/catalog/new?error=missing");
  }

  const db = getDb();
  const [existingCourse] = await db
    .select({ id: courseCatalog.id })
    .from(courseCatalog)
    .where(eq(courseCatalog.courseCode, courseCode))
    .limit(1);

  if (existingCourse) {
    redirect("/admin/catalog/new?error=exists");
  }

  const [catalogCourse] = await db
    .insert(courseCatalog)
    .values({
      courseCode,
      courseTitle,
      programme: cleanString(formData.get("programme")) || null,
      level: cleanString(formData.get("level")) || null,
      description: cleanString(formData.get("description")) || null,
      status: "active",
    })
    .returning({ id: courseCatalog.id });

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "catalog_course_created",
    entityType: "course_catalog",
    entityId: catalogCourse.id,
    newValue: { courseCode, courseTitle },
  });

  revalidatePath("/admin/catalog");
  redirect("/admin/catalog");
}

export async function updateCatalogCourseAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const catalogCourseId = cleanString(formData.get("catalogCourseId"), { uppercase: false });
  const courseCode = cleanString(formData.get("courseCode")).toUpperCase();
  const courseTitle = cleanString(formData.get("courseTitle"));

  if (!catalogCourseId || !courseCode || !courseTitle) {
    redirect(`/admin/catalog/${catalogCourseId}/edit?error=missing`);
  }

  const db = getDb();
  await db
    .update(courseCatalog)
    .set({
      courseCode,
      courseTitle,
      programme: cleanString(formData.get("programme")) || null,
      level: cleanString(formData.get("level")) || null,
      description: cleanString(formData.get("description")) || null,
      status:
        cleanString(formData.get("status"), { uppercase: false }) === "archived"
          ? "archived"
          : "active",
      updatedAt: new Date(),
    })
    .where(eq(courseCatalog.id, catalogCourseId));

  await db
    .update(courses)
    .set({
      courseCode,
      courseTitle,
      programme: cleanString(formData.get("programme")) || null,
      level: cleanString(formData.get("level")) || null,
      updatedAt: new Date(),
    })
    .where(eq(courses.catalogCourseId, catalogCourseId));

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "catalog_course_updated",
    entityType: "course_catalog",
    entityId: catalogCourseId,
    newValue: { courseCode, courseTitle },
  });

  revalidatePath("/admin/catalog");
  revalidatePath("/admin/courses");
  revalidatePath("/lecturer/courses");
  redirect("/admin/catalog");
}

export async function deleteCatalogCourseAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const catalogCourseId = cleanString(formData.get("catalogCourseId"), { uppercase: false });

  if (!catalogCourseId) {
    redirect("/admin/catalog");
  }

  const db = getDb();
  await db.delete(courseCatalog).where(eq(courseCatalog.id, catalogCourseId));
  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "catalog_course_deleted",
    entityType: "course_catalog",
    entityId: catalogCourseId,
  });

  revalidatePath("/admin/catalog");
  revalidatePath("/admin/courses");
  redirect("/admin/catalog");
}

export async function createAssignedCourseAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const catalogCourseId = cleanString(formData.get("catalogCourseId"), { uppercase: false });
  const lecturerId = cleanString(formData.get("lecturerId"), { uppercase: false });
  const semester = cleanString(formData.get("semester"));
  const academicYear = cleanString(formData.get("academicYear"));

  if (!catalogCourseId || !lecturerId || !semester || !academicYear) {
    redirect("/admin/courses/new?error=missing");
  }

  const db = getDb();
  const [catalogCourse] = await db
    .select()
    .from(courseCatalog)
    .where(and(eq(courseCatalog.id, catalogCourseId), eq(courseCatalog.status, "active")))
    .limit(1);

  const [lecturer] = await db
    .select({ id: lecturerProfiles.id })
    .from(lecturerProfiles)
    .where(eq(lecturerProfiles.id, lecturerId))
    .limit(1);

  if (!catalogCourse || !lecturer) {
    redirect("/admin/courses/new?error=invalid");
  }

  const [course] = await db
    .insert(courses)
    .values({
      catalogCourseId,
      courseCode: catalogCourse.courseCode,
      courseTitle: catalogCourse.courseTitle,
      programme: catalogCourse.programme,
      level: catalogCourse.level,
      semester,
      academicYear,
      classGroup: cleanString(formData.get("classGroup")) || "MAIN",
      lecturerId,
      status: "active",
    })
    .returning({ id: courses.id });

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "course_assigned",
    entityType: "course",
    entityId: course.id,
    newValue: { catalogCourseId, lecturerId },
  });

  revalidatePath("/admin/courses");
  revalidatePath("/lecturer/courses");
  redirect("/admin/courses");
}

export async function updateAssignedCourseAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const courseId = cleanString(formData.get("courseId"), { uppercase: false });
  const lecturerId = cleanString(formData.get("lecturerId"), { uppercase: false });
  const status = cleanString(formData.get("status"), { uppercase: false });

  if (!courseId || !lecturerId) {
    redirect(`/admin/courses/${courseId}/edit?error=missing`);
  }

  const db = getDb();
  const [lecturer] = await db
    .select({ id: lecturerProfiles.id })
    .from(lecturerProfiles)
    .where(eq(lecturerProfiles.id, lecturerId))
    .limit(1);

  if (!lecturer) {
    redirect(`/admin/courses/${courseId}/edit?error=lecturer`);
  }

  await db
    .update(courses)
    .set({
      lecturerId,
      semester: cleanString(formData.get("semester")),
      academicYear: cleanString(formData.get("academicYear")),
      classGroup: cleanString(formData.get("classGroup")) || "MAIN",
      status: status === "archived" || status === "draft" ? status : "active",
      updatedAt: new Date(),
    })
    .where(eq(courses.id, courseId));

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "course_assignment_updated",
    entityType: "course",
    entityId: courseId,
    newValue: { lecturerId },
  });

  revalidatePath("/admin/courses");
  revalidatePath("/lecturer/courses");
  redirect("/admin/courses");
}

export async function deleteAssignedCourseAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const courseId = cleanString(formData.get("courseId"), { uppercase: false });

  if (!courseId) {
    redirect("/admin/courses");
  }

  const db = getDb();
  await db.delete(courses).where(eq(courses.id, courseId));
  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "course_assignment_deleted",
    entityType: "course",
    entityId: courseId,
  });

  revalidatePath("/admin/courses");
  revalidatePath("/lecturer/courses");
  redirect("/admin/courses");
}

export async function updateStudentAccountAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const studentId = cleanId(formData.get("studentId"));
  const name = cleanString(formData.get("name"));
  const email = cleanString(formData.get("email"), { uppercase: false }).toLowerCase();
  const studentIdNumber = cleanString(formData.get("studentIdNumber"));
  const status = cleanStudentAccountStatus(formData.get("status"));

  if (!studentId || !name || !email || !studentIdNumber || !status) {
    redirect(`/admin/students/${studentId}/edit?error=missing`);
  }

  const db = getDb();
  const [target] = await db
    .select({
      studentId: studentProfiles.id,
      userId: studentProfiles.userId,
      previousName: users.name,
      previousEmail: users.email,
      previousStatus: users.status,
      previousStudentIdNumber: studentProfiles.studentIdNumber,
      previousProgramme: studentProfiles.programme,
      previousLevel: studentProfiles.level,
      previousClassGroup: studentProfiles.classGroup,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(eq(studentProfiles.id, studentId))
    .limit(1);

  if (!target) {
    redirect("/admin/students?error=missing");
  }

  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingEmail && existingEmail.id !== target.userId) {
    redirect(`/admin/students/${studentId}/edit?error=email`);
  }

  const [existingStudentId] = await db
    .select({ id: studentProfiles.id })
    .from(studentProfiles)
    .where(eq(studentProfiles.studentIdNumber, studentIdNumber))
    .limit(1);

  if (existingStudentId && existingStudentId.id !== target.studentId) {
    redirect(`/admin/students/${studentId}/edit?error=studentId`);
  }

  const programme = cleanString(formData.get("programme")) || null;
  const level = cleanString(formData.get("level")) || null;
  const classGroup = cleanString(formData.get("classGroup")) || null;

  await db
    .update(users)
    .set({ name, email, status, updatedAt: new Date() })
    .where(eq(users.id, target.userId));

  await db
    .update(studentProfiles)
    .set({
      studentIdNumber,
      programme,
      level,
      classGroup,
      updatedAt: new Date(),
    })
    .where(eq(studentProfiles.id, target.studentId));

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "student_account_updated",
    entityType: "student_profile",
    entityId: target.studentId,
    previousValue: {
      name: target.previousName,
      email: target.previousEmail,
      status: target.previousStatus,
      studentIdNumber: target.previousStudentIdNumber,
      programme: target.previousProgramme,
      level: target.previousLevel,
      classGroup: target.previousClassGroup,
    },
    newValue: {
      name,
      email,
      status,
      studentIdNumber,
      programme,
      level,
      classGroup,
    },
  });

  revalidateEnrolmentViews(undefined, undefined);
  revalidatePath(`/admin/students/${studentId}/edit`);
  redirect("/admin/students?accountUpdated=1");
}

export async function deleteStudentAccountAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const studentId = cleanId(formData.get("studentId"));

  if (!studentId) {
    redirect("/admin/students");
  }

  const db = getDb();
  const [target] = await db
    .select({
      studentId: studentProfiles.id,
      userId: studentProfiles.userId,
      studentName: users.name,
      studentEmail: users.email,
      studentIdNumber: studentProfiles.studentIdNumber,
      status: users.status,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(eq(studentProfiles.id, studentId))
    .limit(1);

  if (!target) {
    redirect("/admin/students?error=missing");
  }

  const [enrolmentCount] = await db
    .select({ value: count() })
    .from(enrolments)
    .where(eq(enrolments.studentId, target.studentId));
  const [attendanceRecordCount] = await db
    .select({ value: count() })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.studentId, target.studentId));

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "student_account_deleted",
    entityType: "student_profile",
    entityId: target.studentId,
    previousValue: {
      studentName: target.studentName,
      studentEmail: target.studentEmail,
      studentIdNumber: target.studentIdNumber,
      status: target.status,
      enrolments: enrolmentCount?.value ?? 0,
      attendanceRecords: attendanceRecordCount?.value ?? 0,
    },
  });

  await db.delete(users).where(eq(users.id, target.userId));

  revalidateEnrolmentViews(undefined, target.studentId);
  redirect("/admin/students?accountDeleted=1");
}

export async function bulkDeleteStudentAccountsAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const studentIds = cleanStudentIds(formData);

  if (studentIds.length === 0) {
    redirect("/admin/students?error=bulkStudents");
  }

  const db = getDb();
  const targets = await db
    .select({
      studentId: studentProfiles.id,
      userId: studentProfiles.userId,
      studentName: users.name,
      studentEmail: users.email,
      studentIdNumber: studentProfiles.studentIdNumber,
      status: users.status,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(inArray(studentProfiles.id, studentIds));

  if (targets.length === 0) {
    redirect("/admin/students?error=bulkStudents");
  }

  const targetStudentIds = targets.map((target) => target.studentId);
  const targetUserIds = targets.map((target) => target.userId);
  const enrolmentCounts = await db
    .select({ studentId: enrolments.studentId, value: count() })
    .from(enrolments)
    .where(inArray(enrolments.studentId, targetStudentIds))
    .groupBy(enrolments.studentId);
  const attendanceCounts = await db
    .select({ studentId: attendanceRecords.studentId, value: count() })
    .from(attendanceRecords)
    .where(inArray(attendanceRecords.studentId, targetStudentIds))
    .groupBy(attendanceRecords.studentId);
  const enrolmentCountByStudent = new Map(
    enrolmentCounts.map((row) => [row.studentId, row.value]),
  );
  const attendanceCountByStudent = new Map(
    attendanceCounts.map((row) => [row.studentId, row.value]),
  );

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "student_accounts_bulk_deleted",
    entityType: "student_profile",
    previousValue: {
      count: targets.length,
      students: targets.map((target) => ({
        studentId: target.studentId,
        studentName: target.studentName,
        studentEmail: target.studentEmail,
        studentIdNumber: target.studentIdNumber,
        status: target.status,
        enrolments: enrolmentCountByStudent.get(target.studentId) ?? 0,
        attendanceRecords: attendanceCountByStudent.get(target.studentId) ?? 0,
      })),
    },
  });

  await db.delete(users).where(inArray(users.id, targetUserIds));

  revalidateEnrolmentViews(undefined, undefined);
  redirect(`/admin/students?bulkAccountsDeleted=${targets.length}`);
}

export async function updateEnrolledStudentAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const enrolmentId = cleanId(formData.get("enrolmentId"));
  const courseId = cleanId(formData.get("courseId"));
  const name = cleanString(formData.get("name"));
  const email = cleanString(formData.get("email"), { uppercase: false }).toLowerCase();
  const studentIdNumber = cleanString(formData.get("studentIdNumber"));
  const status = cleanEnrolmentStatus(formData.get("status"));

  if (!enrolmentId || !courseId || !name || !email || !studentIdNumber || !status) {
    redirect(`/admin/students/${enrolmentId}/edit?error=missing`);
  }

  const db = getDb();
  const [target] = await db
    .select({
      enrolmentId: enrolments.id,
      courseId: enrolments.courseId,
      enrolmentStatus: enrolments.status,
      studentId: enrolments.studentId,
      studentUserId: studentProfiles.userId,
      previousName: users.name,
      previousEmail: users.email,
      previousStudentIdNumber: studentProfiles.studentIdNumber,
      previousProgramme: studentProfiles.programme,
      previousLevel: studentProfiles.level,
      previousClassGroup: studentProfiles.classGroup,
    })
    .from(enrolments)
    .innerJoin(studentProfiles, eq(enrolments.studentId, studentProfiles.id))
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(eq(enrolments.id, enrolmentId))
    .limit(1);

  if (!target) {
    redirect("/admin/students?error=missing");
  }

  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course) {
    redirect(`/admin/students/${enrolmentId}/edit?error=course`);
  }

  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingEmail && existingEmail.id !== target.studentUserId) {
    redirect(`/admin/students/${enrolmentId}/edit?error=email`);
  }

  const [existingStudentId] = await db
    .select({ id: studentProfiles.id })
    .from(studentProfiles)
    .where(eq(studentProfiles.studentIdNumber, studentIdNumber))
    .limit(1);

  if (existingStudentId && existingStudentId.id !== target.studentId) {
    redirect(`/admin/students/${enrolmentId}/edit?error=studentId`);
  }

  if (courseId !== target.courseId) {
    const [existingEnrolment] = await db
      .select({ id: enrolments.id })
      .from(enrolments)
      .where(
        and(eq(enrolments.courseId, courseId), eq(enrolments.studentId, target.studentId)),
      )
      .limit(1);

    if (existingEnrolment && existingEnrolment.id !== target.enrolmentId) {
      redirect(`/admin/students/${enrolmentId}/edit?error=duplicate`);
    }

    const existingRecords = await countCourseAttendanceRecords(
      db,
      target.courseId,
      target.studentId,
    );

    if (existingRecords > 0) {
      redirect(`/admin/students/${enrolmentId}/edit?error=courseHistory`);
    }

    await removeAttendancePasskeysForTargets(db, [
      { courseId: target.courseId, studentId: target.studentId },
    ]);
  }

  if (status !== "active") {
    await removeAttendancePasskeysForTargets(db, [
      { courseId, studentId: target.studentId },
    ]);
  }

  await db
    .update(users)
    .set({ name, email, updatedAt: new Date() })
    .where(eq(users.id, target.studentUserId));

  await db
    .update(studentProfiles)
    .set({
      studentIdNumber,
      programme: cleanString(formData.get("programme")) || null,
      level: cleanString(formData.get("level")) || null,
      classGroup: cleanString(formData.get("classGroup")) || null,
      updatedAt: new Date(),
    })
    .where(eq(studentProfiles.id, target.studentId));

  await db
    .update(enrolments)
    .set({ courseId, status, updatedAt: new Date() })
    .where(eq(enrolments.id, target.enrolmentId));

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "student_enrolment_updated",
    entityType: "enrolment",
    entityId: target.enrolmentId,
    previousValue: {
      courseId: target.courseId,
      status: target.enrolmentStatus,
      name: target.previousName,
      email: target.previousEmail,
      studentIdNumber: target.previousStudentIdNumber,
      programme: target.previousProgramme,
      level: target.previousLevel,
      classGroup: target.previousClassGroup,
    },
    newValue: {
      courseId,
      status,
      name,
      email,
      studentIdNumber,
      programme: cleanString(formData.get("programme")) || null,
      level: cleanString(formData.get("level")) || null,
      classGroup: cleanString(formData.get("classGroup")) || null,
    },
  });

  revalidateEnrolmentViews(target.courseId, target.enrolmentId);
  revalidateEnrolmentViews(courseId, target.enrolmentId);
  redirect("/admin/students?updated=1");
}

export async function deleteEnrolledStudentAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const enrolmentId = cleanId(formData.get("enrolmentId"));

  if (!enrolmentId) {
    redirect("/admin/students");
  }

  const db = getDb();
  const [target] = await db
    .select({
      enrolmentId: enrolments.id,
      courseId: enrolments.courseId,
      studentId: enrolments.studentId,
      status: enrolments.status,
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
    .where(eq(enrolments.id, enrolmentId))
    .limit(1);

  if (!target) {
    redirect("/admin/students?error=missing");
  }

  await removeAttendancePasskeysForTargets(db, [
    { courseId: target.courseId, studentId: target.studentId },
  ]);

  await db.delete(enrolments).where(eq(enrolments.id, target.enrolmentId));

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "student_enrolment_deleted",
    entityType: "enrolment",
    entityId: target.enrolmentId,
    previousValue: {
      status: target.status,
      studentName: target.studentName,
      studentEmail: target.studentEmail,
      studentIdNumber: target.studentIdNumber,
      courseCode: target.courseCode,
      courseTitle: target.courseTitle,
    },
  });

  revalidateEnrolmentViews(target.courseId, target.enrolmentId);
  redirect("/admin/students?deleted=1");
}

export async function bulkUpdateEnrolledStudentsAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const enrolmentIds = cleanIds(formData);
  const status = cleanEnrolmentStatus(formData.get("bulkStatus"));

  if (enrolmentIds.length === 0 || !status) {
    redirect("/admin/students?error=bulk");
  }

  const db = getDb();
  const targets = await db
    .select({
      enrolmentId: enrolments.id,
      courseId: enrolments.courseId,
      studentId: enrolments.studentId,
      previousStatus: enrolments.status,
    })
    .from(enrolments)
    .where(inArray(enrolments.id, enrolmentIds));

  if (targets.length === 0) {
    redirect("/admin/students?error=bulk");
  }

  const targetIds = targets.map((target) => target.enrolmentId);

  if (status !== "active") {
    await removeAttendancePasskeysForTargets(db, targets);
  }

  await db
    .update(enrolments)
    .set({ status, updatedAt: new Date() })
    .where(inArray(enrolments.id, targetIds));

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "student_enrolments_bulk_updated",
    entityType: "enrolment",
    previousValue: {
      count: targets.length,
      statuses: targets.reduce<Record<string, number>>((summary, target) => {
        summary[target.previousStatus] = (summary[target.previousStatus] ?? 0) + 1;
        return summary;
      }, {}),
    },
    newValue: { status, enrolmentIds: targetIds },
  });

  for (const courseId of Array.from(new Set(targets.map((target) => target.courseId)))) {
    revalidateEnrolmentViews(courseId);
  }

  redirect(`/admin/students?bulkUpdated=${targets.length}`);
}

export async function bulkDeleteEnrolledStudentsAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const enrolmentIds = cleanIds(formData);

  if (enrolmentIds.length === 0) {
    redirect("/admin/students?error=bulk");
  }

  const db = getDb();
  const targets = await db
    .select({
      enrolmentId: enrolments.id,
      courseId: enrolments.courseId,
      studentId: enrolments.studentId,
      status: enrolments.status,
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
    .where(inArray(enrolments.id, enrolmentIds));

  if (targets.length === 0) {
    redirect("/admin/students?error=bulk");
  }

  const targetIds = targets.map((target) => target.enrolmentId);

  await removeAttendancePasskeysForTargets(db, targets);
  await db.delete(enrolments).where(inArray(enrolments.id, targetIds));

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "student_enrolments_bulk_deleted",
    entityType: "enrolment",
    previousValue: {
      count: targets.length,
      enrolments: targets.map((target) => ({
        enrolmentId: target.enrolmentId,
        status: target.status,
        studentName: target.studentName,
        studentEmail: target.studentEmail,
        studentIdNumber: target.studentIdNumber,
        courseCode: target.courseCode,
        courseTitle: target.courseTitle,
      })),
    },
  });

  for (const courseId of Array.from(new Set(targets.map((target) => target.courseId)))) {
    revalidateEnrolmentViews(courseId);
  }

  redirect(`/admin/students?bulkDeleted=${targets.length}`);
}
