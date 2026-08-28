"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, count, eq, inArray, ne, or } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  academicYears,
  attendanceRecords,
  attendanceSessions,
  auditLogs,
  courseCatalog,
  courses,
  departments,
  faculties,
  enrolments,
  lectureHalls,
  lecturerProfiles,
  studentProfiles,
  users,
} from "@/db/schema";
import { hashPassword, requireRole } from "@/lib/auth";
import { cleanString, fileToDataUrl } from "@/lib/form-utils";
import {
  normalizeProgrammeLevel,
  normalizeStudentCategory,
  parseAcademicYear,
} from "@/lib/institution";

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

function cleanRecordStatus(value: FormDataEntryValue | null) {
  const status = cleanString(value, { uppercase: false });

  return status === "inactive" || status === "archived" ? status : "active";
}

function cleanCourseStatus(value: FormDataEntryValue | null) {
  const status = cleanString(value, { uppercase: false });

  return status === "draft" || status === "archived" ? status : "active";
}

function lectureHallErrorUrl(mode: "new" | "edit", error: string, id?: string) {
  const params = new URLSearchParams({ modal: mode, error });

  if (id) {
    params.set("id", id);
  }

  return `/admin/lecture-halls?${params.toString()}`;
}

export async function createLectureHallAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const name = cleanString(formData.get("name"));
  const code = cleanString(formData.get("code")).toUpperCase();

  if (!name || !code) {
    redirect(lectureHallErrorUrl("new", "missing"));
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: lectureHalls.id })
    .from(lectureHalls)
    .where(eq(lectureHalls.code, code))
    .limit(1);

  if (existing) {
    redirect(lectureHallErrorUrl("new", "exists"));
  }

  const [hall] = await db
    .insert(lectureHalls)
    .values({
      name,
      code,
      building: cleanString(formData.get("building")) || null,
      roomNumber: cleanString(formData.get("roomNumber")) || null,
      notes: cleanString(formData.get("notes")) || null,
      status: "active",
    })
    .returning({ id: lectureHalls.id });

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "lecture_hall_created",
    entityType: "lecture_hall",
    entityId: hall.id,
    newValue: { name, code },
  });

  revalidatePath("/admin/lecture-halls");
  redirect("/admin/lecture-halls?created=1");
}

export async function updateLectureHallAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const lectureHallId = cleanId(formData.get("lectureHallId"));
  const name = cleanString(formData.get("name"));
  const code = cleanString(formData.get("code")).toUpperCase();

  if (!lectureHallId || !name || !code) {
    redirect(lectureHallErrorUrl("edit", "missing", lectureHallId));
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: lectureHalls.id })
    .from(lectureHalls)
    .where(and(ne(lectureHalls.id, lectureHallId), eq(lectureHalls.code, code)))
    .limit(1);

  if (existing) {
    redirect(lectureHallErrorUrl("edit", "exists", lectureHallId));
  }

  await db
    .update(lectureHalls)
    .set({
      name,
      code,
      building: cleanString(formData.get("building")) || null,
      roomNumber: cleanString(formData.get("roomNumber")) || null,
      notes: cleanString(formData.get("notes")) || null,
      status: cleanCourseStatus(formData.get("status")),
      updatedAt: new Date(),
    })
    .where(eq(lectureHalls.id, lectureHallId));

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "lecture_hall_updated",
    entityType: "lecture_hall",
    entityId: lectureHallId,
    newValue: { name, code },
  });

  revalidatePath("/admin/lecture-halls");
  redirect("/admin/lecture-halls?updated=1");
}

export async function deleteLectureHallAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const lectureHallId = cleanId(formData.get("lectureHallId"));

  if (!lectureHallId) {
    redirect("/admin/lecture-halls");
  }

  const db = getDb();
  const [sessionCount] = await db
    .select({ value: count() })
    .from(attendanceSessions)
    .where(eq(attendanceSessions.lectureHallId, lectureHallId));

  if ((sessionCount?.value ?? 0) > 0) {
    await db
      .update(lectureHalls)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(lectureHalls.id, lectureHallId));

    await db.insert(auditLogs).values({
      userId: admin.id,
      action: "lecture_hall_archived",
      entityType: "lecture_hall",
      entityId: lectureHallId,
      newValue: { linkedSessions: sessionCount?.value ?? 0 },
    });

    revalidatePath("/admin/lecture-halls");
    redirect("/admin/lecture-halls?archived=1");
  }

  await db.delete(lectureHalls).where(eq(lectureHalls.id, lectureHallId));
  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "lecture_hall_deleted",
    entityType: "lecture_hall",
    entityId: lectureHallId,
  });

  revalidatePath("/admin/lecture-halls");
  redirect("/admin/lecture-halls?deleted=1");
}

export async function createFacultyAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const name = cleanString(formData.get("name"));
  const code = cleanString(formData.get("code")).toUpperCase();

  if (!name || !code) {
    redirect("/admin/faculties?modal=new&error=missing");
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: faculties.id })
    .from(faculties)
    .where(or(eq(faculties.code, code), eq(faculties.name, name)))
    .limit(1);

  if (existing) {
    redirect("/admin/faculties?modal=new&error=exists");
  }

  const [faculty] = await db
    .insert(faculties)
    .values({
      name,
      code,
      description: cleanString(formData.get("description")) || null,
      status: "active",
    })
    .returning({ id: faculties.id });

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "faculty_created",
    entityType: "faculty",
    entityId: faculty.id,
    newValue: { name, code },
  });

  revalidatePath("/admin/faculties");
  redirect("/admin/faculties");
}

export async function updateFacultyAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const facultyId = cleanId(formData.get("facultyId"));
  const name = cleanString(formData.get("name"));
  const code = cleanString(formData.get("code")).toUpperCase();

  if (!facultyId || !name || !code) {
    redirect(`/admin/faculties?modal=edit&id=${facultyId}&error=missing`);
  }

  const db = getDb();
  const [existingFaculty] = await db
    .select({ id: faculties.id })
    .from(faculties)
    .where(
      and(
        ne(faculties.id, facultyId),
        or(eq(faculties.code, code), eq(faculties.name, name)),
      ),
    )
    .limit(1);

  if (existingFaculty) {
    redirect(`/admin/faculties?modal=edit&id=${facultyId}&error=exists`);
  }

  await db
    .update(faculties)
    .set({
      name,
      code,
      description: cleanString(formData.get("description")) || null,
      status: cleanRecordStatus(formData.get("status")),
      updatedAt: new Date(),
    })
    .where(eq(faculties.id, facultyId));

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "faculty_updated",
    entityType: "faculty",
    entityId: facultyId,
    newValue: { name, code },
  });

  revalidatePath("/admin/faculties");
  revalidatePath("/admin/departments");
  redirect("/admin/faculties?updated=1");
}

export async function deleteFacultyAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const facultyId = cleanId(formData.get("facultyId"));

  if (!facultyId) {
    redirect("/admin/faculties");
  }

  const db = getDb();
  const [[departmentCount], [studentCount], [catalogCount]] = await Promise.all([
    db.select({ value: count() }).from(departments).where(eq(departments.facultyId, facultyId)),
    db.select({ value: count() }).from(studentProfiles).where(eq(studentProfiles.facultyId, facultyId)),
    db.select({ value: count() }).from(courseCatalog).where(eq(courseCatalog.facultyId, facultyId)),
  ]);

  if (
    (departmentCount?.value ?? 0) > 0 ||
    (studentCount?.value ?? 0) > 0 ||
    (catalogCount?.value ?? 0) > 0
  ) {
    await db
      .update(faculties)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(faculties.id, facultyId));
    await db.insert(auditLogs).values({
      userId: admin.id,
      action: "faculty_marked_inactive",
      entityType: "faculty",
      entityId: facultyId,
      newValue: {
        linkedDepartments: departmentCount?.value ?? 0,
        linkedStudents: studentCount?.value ?? 0,
        linkedCatalogEntries: catalogCount?.value ?? 0,
      },
    });
    revalidatePath("/admin/faculties");
    revalidatePath("/admin/departments");
    revalidatePath("/admin/catalog");
    redirect("/admin/faculties?archived=1");
  }

  await db.delete(faculties).where(eq(faculties.id, facultyId));
  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "faculty_deleted",
    entityType: "faculty",
    entityId: facultyId,
  });

  revalidatePath("/admin/faculties");
  revalidatePath("/admin/departments");
  redirect("/admin/faculties?deleted=1");
}

export async function createDepartmentAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const facultyId = cleanId(formData.get("facultyId"));
  const name = cleanString(formData.get("name"));
  const code = cleanString(formData.get("code")).toUpperCase();

  if (!facultyId || !name || !code) {
    redirect("/admin/departments?modal=new&error=missing");
  }

  const db = getDb();
  const [existingDepartment] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(
      or(
        eq(departments.code, code),
        and(eq(departments.facultyId, facultyId), eq(departments.name, name)),
      ),
    )
    .limit(1);

  if (existingDepartment) {
    redirect("/admin/departments?modal=new&error=exists");
  }

  const [department] = await db
    .insert(departments)
    .values({
      facultyId,
      name,
      code,
      description: cleanString(formData.get("description")) || null,
      status: "active",
    })
    .returning({ id: departments.id });

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "department_created",
    entityType: "department",
    entityId: department.id,
    newValue: { facultyId, name, code },
  });

  revalidatePath("/admin/departments");
  revalidatePath("/admin/faculties");
  redirect("/admin/departments");
}

export async function updateDepartmentAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const departmentId = cleanId(formData.get("departmentId"));
  const facultyId = cleanId(formData.get("facultyId"));
  const name = cleanString(formData.get("name"));
  const code = cleanString(formData.get("code")).toUpperCase();

  if (!departmentId || !facultyId || !name || !code) {
    redirect(`/admin/departments?modal=edit&id=${departmentId}&error=missing`);
  }

  const db = getDb();
  const [existingDepartment] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(
      and(
        ne(departments.id, departmentId),
        or(
          eq(departments.code, code),
          and(eq(departments.facultyId, facultyId), eq(departments.name, name)),
        ),
      ),
    )
    .limit(1);

  if (existingDepartment) {
    redirect(`/admin/departments?modal=edit&id=${departmentId}&error=exists`);
  }

  await db
    .update(departments)
    .set({
      facultyId,
      name,
      code,
      description: cleanString(formData.get("description")) || null,
      status: cleanRecordStatus(formData.get("status")),
      updatedAt: new Date(),
    })
    .where(eq(departments.id, departmentId));

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "department_updated",
    entityType: "department",
    entityId: departmentId,
    newValue: { facultyId, name, code },
  });

  revalidatePath("/admin/departments");
  revalidatePath("/admin/faculties");
  revalidatePath("/admin/catalog");
  redirect("/admin/departments?updated=1");
}

export async function deleteDepartmentAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const departmentId = cleanId(formData.get("departmentId"));

  if (!departmentId) {
    redirect("/admin/departments");
  }

  const db = getDb();
  const [[studentCount], [catalogCount]] = await Promise.all([
    db.select({ value: count() }).from(studentProfiles).where(eq(studentProfiles.departmentId, departmentId)),
    db.select({ value: count() }).from(courseCatalog).where(eq(courseCatalog.departmentId, departmentId)),
  ]);

  if ((studentCount?.value ?? 0) > 0 || (catalogCount?.value ?? 0) > 0) {
    await db
      .update(departments)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(departments.id, departmentId));
    await db.insert(auditLogs).values({
      userId: admin.id,
      action: "department_marked_inactive",
      entityType: "department",
      entityId: departmentId,
      newValue: {
        linkedStudents: studentCount?.value ?? 0,
        linkedCatalogEntries: catalogCount?.value ?? 0,
      },
    });
    revalidatePath("/admin/departments");
    revalidatePath("/admin/faculties");
    revalidatePath("/admin/catalog");
    redirect("/admin/departments?archived=1");
  }

  await db.delete(departments).where(eq(departments.id, departmentId));
  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "department_deleted",
    entityType: "department",
    entityId: departmentId,
  });

  revalidatePath("/admin/departments");
  revalidatePath("/admin/faculties");
  revalidatePath("/admin/catalog");
  redirect("/admin/departments?deleted=1");
}

export async function createAcademicYearAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const parsed = parseAcademicYear(cleanString(formData.get("displayName"), { uppercase: false }));

  if (!parsed) {
    redirect("/admin/academic-years?modal=new&error=format");
  }

  const db = getDb();
  const [year] = await db
    .insert(academicYears)
    .values({
      startYear: parsed.startYear,
      endYear: parsed.endYear,
      displayName: parsed.displayName,
      isCurrent: false,
      status: "active",
    })
    .returning({ id: academicYears.id });

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "academic_year_created",
    entityType: "academic_year",
    entityId: year.id,
    newValue: parsed,
  });

  revalidatePath("/admin/academic-years");
  redirect("/admin/academic-years");
}

export async function updateAcademicYearAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const academicYearId = cleanId(formData.get("academicYearId"));
  const parsed = parseAcademicYear(cleanString(formData.get("displayName"), { uppercase: false }));
  const isCurrent = formData.get("isCurrent") === "on";

  if (!academicYearId || !parsed) {
    redirect(`/admin/academic-years?modal=edit&id=${academicYearId}&error=format`);
  }

  const db = getDb();

  if (isCurrent) {
    await db
      .update(academicYears)
      .set({ isCurrent: false, updatedAt: new Date() })
      .where(eq(academicYears.isCurrent, true));
  }

  await db
    .update(academicYears)
    .set({
      startYear: parsed.startYear,
      endYear: parsed.endYear,
      displayName: parsed.displayName,
      isCurrent,
      status: cleanRecordStatus(formData.get("status")),
      updatedAt: new Date(),
    })
    .where(eq(academicYears.id, academicYearId));

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "academic_year_updated",
    entityType: "academic_year",
    entityId: academicYearId,
    newValue: { ...parsed, isCurrent },
  });

  revalidatePath("/admin/academic-years");
  redirect("/admin/academic-years");
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

export async function createLecturerAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const name = cleanString(formData.get("name"));
  const email = cleanString(formData.get("email"), { uppercase: false }).toLowerCase();
  const password = cleanString(formData.get("password"), { uppercase: false });

  if (!name || !email || password.length < 8) {
    redirect("/admin/lecturers?modal=new&error=invalid");
  }

  const db = getDb();
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    redirect("/admin/lecturers?modal=new&error=exists");
  }

  const avatarUrl = await fileToDataUrl(formData.get("avatar"));

  if (avatarUrl === "invalid") {
    redirect("/admin/lecturers?modal=new&error=image");
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
    redirect(`/admin/lecturers?modal=edit&id=${lecturerId}&error=invalid`);
  }

  const avatarUrl = await fileToDataUrl(formData.get("avatar"));

  if (avatarUrl === "invalid") {
    redirect(`/admin/lecturers?modal=edit&id=${lecturerId}&error=image`);
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
    redirect(`/admin/lecturers?modal=edit&id=${lecturerId}&error=assigned`);
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
    redirect("/admin/catalog?modal=new&error=missing");
  }

  const db = getDb();
  const facultyId = cleanId(formData.get("facultyId")) || null;
  const departmentId = cleanId(formData.get("departmentId")) || null;
  const academicYearId = cleanId(formData.get("academicYearId")) || null;

  if (facultyId && departmentId) {
    const [department] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(and(eq(departments.id, departmentId), eq(departments.facultyId, facultyId)))
      .limit(1);

    if (!department) {
      redirect("/admin/catalog?modal=new&error=department");
    }
  }

  const [existingCourse] = await db
    .select({ id: courseCatalog.id })
    .from(courseCatalog)
    .where(eq(courseCatalog.courseCode, courseCode))
    .limit(1);

  if (existingCourse) {
    redirect("/admin/catalog?modal=new&error=exists");
  }

  const [catalogCourse] = await db
    .insert(courseCatalog)
    .values({
      courseCode,
      courseTitle,
      programme: cleanString(formData.get("programme")) || null,
      level: cleanString(formData.get("level")) || null,
      facultyId,
      departmentId,
      academicYearId,
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
    redirect(`/admin/catalog?modal=edit&id=${catalogCourseId}&error=missing`);
  }

  const db = getDb();
  const facultyId = cleanId(formData.get("facultyId")) || null;
  const departmentId = cleanId(formData.get("departmentId")) || null;
  const academicYearId = cleanId(formData.get("academicYearId")) || null;

  if (facultyId && departmentId) {
    const [department] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(and(eq(departments.id, departmentId), eq(departments.facultyId, facultyId)))
      .limit(1);

    if (!department) {
      redirect(`/admin/catalog?modal=edit&id=${catalogCourseId}&error=department`);
    }
  }

  await db
    .update(courseCatalog)
    .set({
      courseCode,
      courseTitle,
      programme: cleanString(formData.get("programme")) || null,
      level: cleanString(formData.get("level")) || null,
      facultyId,
      departmentId,
      academicYearId,
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
  const [linkedCourses] = await db
    .select({ total: count() })
    .from(courses)
    .where(eq(courses.catalogCourseId, catalogCourseId));

  if ((linkedCourses?.total ?? 0) > 0) {
    await db
      .update(courseCatalog)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(courseCatalog.id, catalogCourseId));

    await db.insert(auditLogs).values({
      userId: admin.id,
      action: "catalog_course_archived",
      entityType: "course_catalog",
      entityId: catalogCourseId,
      reason: "Course catalogue record is linked to assigned courses.",
    });

    revalidatePath("/admin/catalog");
    revalidatePath("/admin/courses");
    redirect("/admin/catalog?archived=1");
  }

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
    redirect("/admin/courses?modal=new&error=missing");
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
    redirect("/admin/courses?modal=new&error=invalid");
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
    redirect(`/admin/courses?modal=edit&id=${courseId}&error=missing`);
  }

  const db = getDb();
  const [lecturer] = await db
    .select({ id: lecturerProfiles.id })
    .from(lecturerProfiles)
    .where(eq(lecturerProfiles.id, lecturerId))
    .limit(1);

  if (!lecturer) {
    redirect(`/admin/courses?modal=edit&id=${courseId}&error=lecturer`);
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
  const studentCategory = normalizeStudentCategory(
    cleanString(formData.get("studentCategory"), { uppercase: false }),
  );
  const programmeLevel = normalizeProgrammeLevel(
    cleanString(formData.get("programmeLevel"), { uppercase: false }),
  );
  const facultyId = cleanId(formData.get("facultyId")) || null;
  const departmentId = cleanId(formData.get("departmentId")) || null;
  const academicYearId = cleanId(formData.get("academicYearId")) || null;

  if (!studentId || !name || !email || !studentIdNumber || !status || !studentCategory || !programmeLevel) {
    redirect(`/admin/students?modal=edit&id=${studentId}&error=missing`);
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
      previousStudentCategory: studentProfiles.studentCategory,
      previousProgrammeLevel: studentProfiles.programmeLevel,
      previousFacultyId: studentProfiles.facultyId,
      previousDepartmentId: studentProfiles.departmentId,
      previousAcademicYearId: studentProfiles.academicYearId,
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
    redirect(`/admin/students?modal=edit&id=${studentId}&error=email`);
  }

  const [existingStudentId] = await db
    .select({ id: studentProfiles.id })
    .from(studentProfiles)
    .where(eq(studentProfiles.studentIdNumber, studentIdNumber))
    .limit(1);

  if (existingStudentId && existingStudentId.id !== target.studentId) {
    redirect(`/admin/students?modal=edit&id=${studentId}&error=studentId`);
  }

  const programme = cleanString(formData.get("programme")) || null;
  const level = cleanString(formData.get("level")) || null;
  const classGroup = cleanString(formData.get("classGroup")) || null;

  if (facultyId && departmentId) {
    const [department] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(and(eq(departments.id, departmentId), eq(departments.facultyId, facultyId)))
      .limit(1);

    if (!department) {
      redirect(`/admin/students?modal=edit&id=${studentId}&error=department`);
    }
  }

  await db
    .update(users)
    .set({ name, email, status, updatedAt: new Date() })
    .where(eq(users.id, target.userId));

  await db
    .update(studentProfiles)
    .set({
      studentIdNumber,
      studentCategory,
      programmeLevel,
      facultyId,
      departmentId,
      academicYearId,
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
      studentCategory: target.previousStudentCategory,
      programmeLevel: target.previousProgrammeLevel,
      facultyId: target.previousFacultyId,
      departmentId: target.previousDepartmentId,
      academicYearId: target.previousAcademicYearId,
      programme: target.previousProgramme,
      level: target.previousLevel,
      classGroup: target.previousClassGroup,
    },
    newValue: {
      name,
      email,
      status,
      studentIdNumber,
      studentCategory,
      programmeLevel,
      facultyId,
      departmentId,
      academicYearId,
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
