"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  attendanceSessions,
  auditLogs,
  courses,
  lectureHalls,
  lecturerProfiles,
  users,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";

function cleanString(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseDate(value: FormDataEntryValue | null) {
  const text = cleanString(value);
  const date = text ? new Date(text) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function errorUrl(error: string) {
  return `/admin/lectures?modal=new&error=${error}`;
}

export async function createLectureAction(formData: FormData) {
  const admin = await requireRole("administrator");
  const courseId = cleanString(formData.get("courseId"));
  const lectureHallId = cleanString(formData.get("lectureHallId")) || null;
  const sessionTitle = cleanString(formData.get("sessionTitle"));
  const opensAt = parseDate(formData.get("opensAt"));
  const normalClosesAt = parseDate(formData.get("normalClosesAt"));
  const finalClosesAt = parseDate(formData.get("finalClosesAt"));

  if (!courseId || !sessionTitle || !opensAt || !normalClosesAt || !finalClosesAt) {
    redirect(errorUrl("missing"));
  }
  if (!(opensAt < normalClosesAt && normalClosesAt <= finalClosesAt)) {
    redirect(errorUrl("time"));
  }

  const db = getDb();
  const [course] = await db
    .select({
      id: courses.id,
      lecturerId: courses.lecturerId,
    })
    .from(courses)
    .innerJoin(lecturerProfiles, eq(courses.lecturerId, lecturerProfiles.id))
    .innerJoin(users, eq(lecturerProfiles.userId, users.id))
    .where(
      and(
        eq(courses.id, courseId),
        eq(courses.status, "active"),
        eq(users.status, "active"),
      ),
    )
    .limit(1);

  if (!course) redirect(errorUrl("course"));

  if (lectureHallId) {
    const [hall] = await db
      .select({ id: lectureHalls.id })
      .from(lectureHalls)
      .where(and(eq(lectureHalls.id, lectureHallId), eq(lectureHalls.status, "active")))
      .limit(1);
    if (!hall) redirect(errorUrl("venue"));
  }

  const [lecture] = await db
    .insert(attendanceSessions)
    .values({
      courseId: course.id,
      lecturerId: course.lecturerId,
      lectureHallId,
      sessionTitle,
      sessionDate: opensAt,
      opensAt,
      normalClosesAt,
      finalClosesAt,
      status: "open",
    })
    .returning({ id: attendanceSessions.id });

  await db.insert(auditLogs).values({
    userId: admin.id,
    action: "attendance_session_created",
    entityType: "attendance_session",
    entityId: lecture.id,
    newValue: {
      courseId,
      lecturerId: course.lecturerId,
      lectureHallId,
      sessionTitle,
      verificationMethod: "rotating_qr",
      opensAt,
      normalClosesAt,
      finalClosesAt,
    },
  });

  revalidatePath("/admin/lectures");
  revalidatePath("/lecturer/sessions");
  revalidatePath(`/lecturer/courses/${courseId}`);
  revalidatePath(`/lecturer/courses/${courseId}/sessions`);
  redirect(`/admin/lectures?created=1&id=${lecture.id}`);
}
