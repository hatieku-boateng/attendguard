import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { and, eq, or } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  academicYears,
  auditLogs,
  courseCatalog,
  courses,
  departments,
  enrolments,
  faculties,
  lecturerProfiles,
  studentProfiles,
  users,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { requireIntegrationRequest } from "@/lib/integration-auth";
import { normalizeProgrammeLevel, normalizeStudentCategory } from "@/lib/institution";

type SyncItem = Record<string, unknown>;
type SyncResult = { created: number; updated: number; skipped: number; errors: number };
type AccountStatus = "pending" | "active" | "suspended" | "disabled";
type CourseStatus = "draft" | "active" | "archived";
type EnrolmentStatus = "active" | "withdrawn" | "completed";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function upper(value: unknown) {
  return text(value).toUpperCase();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function status(value: unknown, fallback = "active") {
  const normalized = lower(value);

  return normalized || fallback;
}

function statusFromList<T extends string>(value: unknown, allowed: readonly T[], fallback: T) {
  const normalized = lower(value);

  return allowed.includes(normalized as T) ? (normalized as T) : fallback;
}

function accountStatus(value: unknown, fallback: AccountStatus): AccountStatus {
  return statusFromList(value, ["pending", "active", "suspended", "disabled"], fallback);
}

function courseStatus(value: unknown, fallback: CourseStatus): CourseStatus {
  return statusFromList(value, ["draft", "active", "archived"], fallback);
}

function enrolmentStatus(value: unknown, fallback: EnrolmentStatus): EnrolmentStatus {
  return statusFromList(value, ["active", "withdrawn", "completed"], fallback);
}

function getItems(body: unknown): SyncItem[] {
  if (Array.isArray(body)) {
    return body.filter((item): item is SyncItem => item !== null && typeof item === "object");
  }

  if (body && typeof body === "object" && Array.isArray((body as { items?: unknown }).items)) {
    return (body as { items: unknown[] }).items.filter(
      (item): item is SyncItem => item !== null && typeof item === "object",
    );
  }

  return body && typeof body === "object" ? [body as SyncItem] : [];
}

async function findFacultyId(db: ReturnType<typeof getDb>, item: SyncItem, sourceSystem: string) {
  const externalId = text(item.facultyExternalId);
  const code = upper(item.facultyCode);

  if (externalId) {
    const [faculty] = await db
      .select({ id: faculties.id })
      .from(faculties)
      .where(and(eq(faculties.sourceSystem, sourceSystem), eq(faculties.externalId, externalId)))
      .limit(1);

    if (faculty) return faculty.id;
  }

  if (code) {
    const [faculty] = await db
      .select({ id: faculties.id })
      .from(faculties)
      .where(eq(faculties.code, code))
      .limit(1);

    if (faculty) return faculty.id;
  }

  return null;
}

async function findDepartmentId(db: ReturnType<typeof getDb>, item: SyncItem, sourceSystem: string) {
  const externalId = text(item.departmentExternalId);
  const code = upper(item.departmentCode);

  if (externalId) {
    const [department] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(and(eq(departments.sourceSystem, sourceSystem), eq(departments.externalId, externalId)))
      .limit(1);

    if (department) return department.id;
  }

  if (code) {
    const [department] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.code, code))
      .limit(1);

    if (department) return department.id;
  }

  return null;
}

async function findAcademicYearId(db: ReturnType<typeof getDb>, item: SyncItem, sourceSystem: string) {
  const externalId = text(item.academicYearExternalId);
  const displayName = text(item.academicYear);

  if (externalId) {
    const [year] = await db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(and(eq(academicYears.sourceSystem, sourceSystem), eq(academicYears.externalId, externalId)))
      .limit(1);

    if (year) return year.id;
  }

  if (displayName) {
    const [year] = await db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(eq(academicYears.displayName, displayName))
      .limit(1);

    if (year) return year.id;
  }

  return null;
}

async function syncFaculty(db: ReturnType<typeof getDb>, item: SyncItem, sourceSystem: string) {
  const externalId = text(item.externalId);
  const name = text(item.name);
  const code = upper(item.code);

  if (!externalId || !name || !code) return "skipped";

  const [existing] = await db
    .select({ id: faculties.id })
    .from(faculties)
    .where(or(and(eq(faculties.sourceSystem, sourceSystem), eq(faculties.externalId, externalId)), eq(faculties.code, code)))
    .limit(1);

  if (existing) {
    await db
      .update(faculties)
      .set({
        name,
        code,
        externalId,
        sourceSystem,
        description: text(item.description) || null,
        status: status(item.status),
        updatedAt: new Date(),
      })
      .where(eq(faculties.id, existing.id));
    return "updated";
  }

  await db.insert(faculties).values({
    name,
    code,
    externalId,
    sourceSystem,
    description: text(item.description) || null,
    status: status(item.status),
  });
  return "created";
}

async function syncDepartment(db: ReturnType<typeof getDb>, item: SyncItem, sourceSystem: string) {
  const externalId = text(item.externalId);
  const name = text(item.name);
  const code = upper(item.code);
  const facultyId = await findFacultyId(db, item, sourceSystem);

  if (!externalId || !name || !code || !facultyId) return "skipped";

  const [existing] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(or(and(eq(departments.sourceSystem, sourceSystem), eq(departments.externalId, externalId)), eq(departments.code, code)))
    .limit(1);

  if (existing) {
    await db
      .update(departments)
      .set({
        facultyId,
        name,
        code,
        externalId,
        sourceSystem,
        description: text(item.description) || null,
        status: status(item.status),
        updatedAt: new Date(),
      })
      .where(eq(departments.id, existing.id));
    return "updated";
  }

  await db.insert(departments).values({
    facultyId,
    name,
    code,
    externalId,
    sourceSystem,
    description: text(item.description) || null,
    status: status(item.status),
  });
  return "created";
}

async function upsertUser({
  db,
  email,
  name,
  role,
  statusValue,
}: {
  db: ReturnType<typeof getDb>;
  email: string;
  name: string;
  role: "lecturer" | "student";
  statusValue: "pending" | "active" | "suspended" | "disabled";
}) {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (existing) {
    await db
      .update(users)
      .set({ name, role, status: statusValue, updatedAt: new Date() })
      .where(eq(users.id, existing.id));
    return existing.id;
  }

  const passwordHash = await hashPassword(randomBytes(18).toString("base64url"));
  const [created] = await db
    .insert(users)
    .values({ name, email, passwordHash, role, status: statusValue })
    .returning({ id: users.id });

  return created.id;
}

async function syncLecturer(db: ReturnType<typeof getDb>, item: SyncItem, sourceSystem: string) {
  const externalId = text(item.externalId);
  const name = text(item.name);
  const email = lower(item.email);
  const staffId = upper(item.staffId);

  if (!externalId || !name || !email) return "skipped";

  const userId = await upsertUser({
    db,
    email,
    name,
    role: "lecturer",
    statusValue: accountStatus(item.accountStatus, "active"),
  });
  const [existing] = await db
    .select({ id: lecturerProfiles.id })
    .from(lecturerProfiles)
    .where(or(and(eq(lecturerProfiles.sourceSystem, sourceSystem), eq(lecturerProfiles.externalId, externalId)), eq(lecturerProfiles.userId, userId)))
    .limit(1);

  const values = {
    userId,
    staffId: staffId || null,
    externalId,
    sourceSystem,
    department: text(item.department) || null,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(lecturerProfiles).set(values).where(eq(lecturerProfiles.id, existing.id));
    return "updated";
  }

  await db.insert(lecturerProfiles).values(values);
  return "created";
}

async function syncStudent(db: ReturnType<typeof getDb>, item: SyncItem, sourceSystem: string) {
  const externalId = text(item.externalId);
  const name = text(item.name);
  const email = lower(item.email);
  const studentIdNumber = upper(item.studentIdNumber);

  if (!externalId || !name || !email || !studentIdNumber) return "skipped";

  const userId = await upsertUser({
    db,
    email,
    name,
    role: "student",
    statusValue: accountStatus(item.accountStatus, "pending"),
  });
  const facultyId = await findFacultyId(db, item, sourceSystem);
  const departmentId = await findDepartmentId(db, item, sourceSystem);
  const academicYearId = await findAcademicYearId(db, item, sourceSystem);
  const [existing] = await db
    .select({ id: studentProfiles.id })
    .from(studentProfiles)
    .where(or(and(eq(studentProfiles.sourceSystem, sourceSystem), eq(studentProfiles.externalId, externalId)), eq(studentProfiles.userId, userId), eq(studentProfiles.studentIdNumber, studentIdNumber)))
    .limit(1);

  const values = {
    userId,
    studentIdNumber,
    externalId,
    sourceSystem,
    studentCategory: normalizeStudentCategory(text(item.studentCategory)) ?? "regular",
    programmeLevel: normalizeProgrammeLevel(text(item.programmeLevel)) ?? "undergraduate",
    facultyId,
    departmentId,
    academicYearId,
    programme: text(item.programme) || null,
    level: upper(item.level) || null,
    classGroup: upper(item.classGroup) || null,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(studentProfiles).set(values).where(eq(studentProfiles.id, existing.id));
    return "updated";
  }

  await db.insert(studentProfiles).values(values);
  return "created";
}

async function syncCourseCatalog(db: ReturnType<typeof getDb>, item: SyncItem, sourceSystem: string) {
  const externalId = text(item.externalId);
  const courseCode = upper(item.courseCode);
  const courseTitle = text(item.courseTitle);

  if (!externalId || !courseCode || !courseTitle) return "skipped";

  const facultyId = await findFacultyId(db, item, sourceSystem);
  const departmentId = await findDepartmentId(db, item, sourceSystem);
  const academicYearId = await findAcademicYearId(db, item, sourceSystem);
  const [existing] = await db
    .select({ id: courseCatalog.id })
    .from(courseCatalog)
    .where(or(and(eq(courseCatalog.sourceSystem, sourceSystem), eq(courseCatalog.externalId, externalId)), eq(courseCatalog.courseCode, courseCode)))
    .limit(1);

  const values = {
    courseCode,
    courseTitle,
    externalId,
    sourceSystem,
    programme: text(item.programme) || null,
    level: upper(item.level) || null,
    academicYearId,
    facultyId,
    departmentId,
    description: text(item.description) || null,
    status: courseStatus(item.status, "active"),
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(courseCatalog).set(values).where(eq(courseCatalog.id, existing.id));
    return "updated";
  }

  await db.insert(courseCatalog).values(values);
  return "created";
}

async function findLecturerId(db: ReturnType<typeof getDb>, item: SyncItem, sourceSystem: string) {
  const externalId = text(item.lecturerExternalId);
  const staffId = upper(item.staffId);
  const email = lower(item.lecturerEmail);

  if (externalId) {
    const [lecturer] = await db
      .select({ id: lecturerProfiles.id })
      .from(lecturerProfiles)
      .where(and(eq(lecturerProfiles.sourceSystem, sourceSystem), eq(lecturerProfiles.externalId, externalId)))
      .limit(1);

    if (lecturer) return lecturer.id;
  }

  if (staffId) {
    const [lecturer] = await db
      .select({ id: lecturerProfiles.id })
      .from(lecturerProfiles)
      .where(eq(lecturerProfiles.staffId, staffId))
      .limit(1);

    if (lecturer) return lecturer.id;
  }

  if (email) {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (user) {
      const [lecturer] = await db
        .select({ id: lecturerProfiles.id })
        .from(lecturerProfiles)
        .where(eq(lecturerProfiles.userId, user.id))
        .limit(1);

      if (lecturer) return lecturer.id;
    }
  }

  return null;
}

async function syncCourse(db: ReturnType<typeof getDb>, item: SyncItem, sourceSystem: string) {
  const externalId = text(item.externalId);
  const courseCode = upper(item.courseCode);
  const courseTitle = text(item.courseTitle);
  const semester = text(item.semester);
  const academicYear = text(item.academicYear);
  const lecturerId = await findLecturerId(db, item, sourceSystem);

  if (!externalId || !courseCode || !courseTitle || !semester || !academicYear || !lecturerId) {
    return "skipped";
  }

  const [catalog] = await db
    .select({ id: courseCatalog.id })
    .from(courseCatalog)
    .where(or(and(eq(courseCatalog.sourceSystem, sourceSystem), eq(courseCatalog.externalId, text(item.catalogExternalId))), eq(courseCatalog.courseCode, courseCode)))
    .limit(1);
  const [existing] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.sourceSystem, sourceSystem), eq(courses.externalId, externalId)))
    .limit(1);

  const values = {
    catalogCourseId: catalog?.id ?? null,
    courseCode,
    courseTitle,
    externalId,
    sourceSystem,
    programme: text(item.programme) || null,
    level: upper(item.level) || null,
    semester,
    academicYear,
    classGroup: upper(item.classGroup) || "MAIN",
    lecturerId,
    status: courseStatus(item.status, "active"),
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(courses).set(values).where(eq(courses.id, existing.id));
    return "updated";
  }

  await db.insert(courses).values(values);
  return "created";
}

async function syncEnrolment(db: ReturnType<typeof getDb>, item: SyncItem, sourceSystem: string) {
  const externalId = text(item.externalId);
  const courseExternalId = text(item.courseExternalId);
  const studentExternalId = text(item.studentExternalId);

  if (!externalId || !courseExternalId || !studentExternalId) return "skipped";

  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.sourceSystem, sourceSystem), eq(courses.externalId, courseExternalId)))
    .limit(1);
  const [student] = await db
    .select({ id: studentProfiles.id })
    .from(studentProfiles)
    .where(and(eq(studentProfiles.sourceSystem, sourceSystem), eq(studentProfiles.externalId, studentExternalId)))
    .limit(1);

  if (!course || !student) return "skipped";

  const [existing] = await db
    .select({ id: enrolments.id })
    .from(enrolments)
    .where(or(and(eq(enrolments.sourceSystem, sourceSystem), eq(enrolments.externalId, externalId)), and(eq(enrolments.courseId, course.id), eq(enrolments.studentId, student.id))))
    .limit(1);
  const values = {
    courseId: course.id,
    studentId: student.id,
    externalId,
    sourceSystem,
    status: enrolmentStatus(item.status, "active"),
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(enrolments).set(values).where(eq(enrolments.id, existing.id));
    return "updated";
  }

  await db.insert(enrolments).values(values);
  return "created";
}

const syncHandlers = {
  faculties: syncFaculty,
  departments: syncDepartment,
  lecturers: syncLecturer,
  students: syncStudent,
  "course-catalog": syncCourseCatalog,
  courses: syncCourse,
  enrolments: syncEnrolment,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  const auth = requireIntegrationRequest(request);
  if (!auth.ok) return auth.response;

  const { entity } = await params;
  const handler = syncHandlers[entity as keyof typeof syncHandlers];

  if (!handler) {
    return NextResponse.json({ error: "Unsupported integration entity." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const items = getItems(body);
  const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: 0 };
  const db = getDb();

  for (const item of items) {
    try {
      const outcome = await handler(db, item, auth.context.sourceSystem);
      result[outcome] += 1;
    } catch (error) {
      console.error("Integration sync error", { entity, error });
      result.errors += 1;
    }
  }

  await db.insert(auditLogs).values({
    action: "integration.sync",
    entityType: entity,
    previousValue: null,
    newValue: {
      sourceSystem: auth.context.sourceSystem,
      received: items.length,
      ...result,
    },
    reason: "External system synchronization",
  });

  return NextResponse.json({
    entity,
    sourceSystem: auth.context.sourceSystem,
    received: items.length,
    ...result,
  });
}
