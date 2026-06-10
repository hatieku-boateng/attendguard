"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  auditLogs,
  courseCatalog,
  courses,
  lecturerProfiles,
  users,
} from "@/db/schema";
import { hashPassword, requireRole } from "@/lib/auth";
import { cleanString, fileToDataUrl } from "@/lib/form-utils";

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
  const lecturerId = cleanString(formData.get("lecturerId"));
  const name = cleanString(formData.get("name"));
  const email = cleanString(formData.get("email")).toLowerCase();

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
  const lecturerId = cleanString(formData.get("lecturerId"));

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
  const catalogCourseId = cleanString(formData.get("catalogCourseId"));
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
      status: cleanString(formData.get("status")) === "archived" ? "archived" : "active",
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
  const catalogCourseId = cleanString(formData.get("catalogCourseId"));

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
  const catalogCourseId = cleanString(formData.get("catalogCourseId"));
  const lecturerId = cleanString(formData.get("lecturerId"));
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
      classGroup: cleanString(formData.get("classGroup")) || "main",
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
  const courseId = cleanString(formData.get("courseId"));
  const lecturerId = cleanString(formData.get("lecturerId"));
  const status = cleanString(formData.get("status"));

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
      classGroup: cleanString(formData.get("classGroup")) || "main",
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
  const courseId = cleanString(formData.get("courseId"));

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
