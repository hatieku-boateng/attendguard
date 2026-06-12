"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  attendanceAttempts,
  attendancePasskeys,
  attendanceRecords,
  attendanceSessions,
  auditLogs,
  courses,
  enrolments,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { isValidCoordinate } from "@/lib/geo";
import { encryptPasskey, generatePasskey, hashPasskey } from "@/lib/passkeys";

function cleanString(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseNumber(value: FormDataEntryValue | null) {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function parseDate(value: FormDataEntryValue | null) {
  const text = cleanString(value);
  const date = text ? new Date(text) : null;

  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export async function createAttendanceSessionAction(formData: FormData) {
  const user = await requireRole("lecturer");
  const courseId = cleanString(formData.get("courseId"));
  const sessionTitle = cleanString(formData.get("sessionTitle"));
  const lecturerLatitude = parseNumber(formData.get("lecturerLatitude"));
  const lecturerLongitude = parseNumber(formData.get("lecturerLongitude"));
  const lecturerLocationAccuracy = parseNumber(formData.get("lecturerLocationAccuracy"));
  const geofenceRadiusMeters = parseNumber(formData.get("geofenceRadiusMeters"));
  const maxAcceptedAccuracyMeters = parseNumber(formData.get("maxAcceptedAccuracyMeters"));
  const opensAt = parseDate(formData.get("opensAt"));
  const normalClosesAt = parseDate(formData.get("normalClosesAt"));
  const finalClosesAt = parseDate(formData.get("finalClosesAt"));

  if (
    !user.lecturerProfileId ||
    !courseId ||
    !sessionTitle ||
    lecturerLatitude === null ||
    lecturerLongitude === null ||
    lecturerLocationAccuracy === null ||
    !geofenceRadiusMeters ||
    !maxAcceptedAccuracyMeters ||
    !opensAt ||
    !normalClosesAt ||
    !finalClosesAt
  ) {
    redirect(`/lecturer/sessions/new?courseId=${courseId}&error=missing`);
  }

  if (geofenceRadiusMeters < 10 || maxAcceptedAccuracyMeters < 10) {
    redirect(`/lecturer/sessions/new?courseId=${courseId}&error=missing`);
  }

  if (!isValidCoordinate(lecturerLatitude, lecturerLongitude)) {
    redirect(`/lecturer/sessions/new?courseId=${courseId}&error=location`);
  }

  if (lecturerLocationAccuracy > maxAcceptedAccuracyMeters) {
    redirect(`/lecturer/sessions/new?courseId=${courseId}&error=lecturer-accuracy`);
  }

  if (!(opensAt < normalClosesAt && normalClosesAt <= finalClosesAt)) {
    redirect(`/lecturer/sessions/new?courseId=${courseId}&error=time`);
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

  const [session] = await db
    .insert(attendanceSessions)
    .values({
      courseId,
      lecturerId: user.lecturerProfileId,
      sessionTitle,
      sessionDate: opensAt,
      lecturerLatitude: String(lecturerLatitude),
      lecturerLongitude: String(lecturerLongitude),
      lecturerLocationAccuracy:
        lecturerLocationAccuracy === null ? null : String(lecturerLocationAccuracy),
      geofenceRadiusMeters,
      maxAcceptedAccuracyMeters,
      opensAt,
      normalClosesAt,
      finalClosesAt,
      status: "open",
    })
    .returning({ id: attendanceSessions.id });

  await db.insert(auditLogs).values({
    userId: user.id,
    action: "attendance_session_created",
    entityType: "attendance_session",
    entityId: session.id,
    newValue: {
      courseId,
      sessionTitle,
      geofenceRadiusMeters,
      maxAcceptedAccuracyMeters,
      lecturerLocationAccuracy,
    },
  });

  revalidatePath("/lecturer/sessions");
  redirect(`/lecturer/sessions/${session.id}`);
}

export async function closeAttendanceSessionAction(formData: FormData) {
  const user = await requireRole("lecturer");
  const sessionId = cleanString(formData.get("sessionId"));

  if (!user.lecturerProfileId || !sessionId) {
    redirect("/lecturer/sessions");
  }

  const db = getDb();
  await db
    .update(attendanceSessions)
    .set({ status: "closed", updatedAt: new Date() })
    .where(
      and(
        eq(attendanceSessions.id, sessionId),
        eq(attendanceSessions.lecturerId, user.lecturerProfileId),
      ),
    );

  await db.insert(auditLogs).values({
    userId: user.id,
    action: "attendance_session_closed",
    entityType: "attendance_session",
    entityId: sessionId,
  });

  revalidatePath("/lecturer/sessions");
  revalidatePath(`/lecturer/sessions/${sessionId}`);
}

export async function generatePasskeysAction(formData: FormData) {
  const user = await requireRole("lecturer");
  const sessionId = cleanString(formData.get("sessionId"));

  if (!user.lecturerProfileId || !sessionId) {
    redirect("/lecturer/sessions");
  }

  const db = getDb();
  const [session] = await db
    .select()
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.id, sessionId),
        eq(attendanceSessions.lecturerId, user.lecturerProfileId),
      ),
    )
    .limit(1);

  if (!session) {
    redirect("/lecturer/sessions");
  }

  const students = await db
    .select({ studentId: enrolments.studentId })
    .from(enrolments)
    .where(
      and(
        eq(enrolments.courseId, session.courseId),
        eq(enrolments.status, "active"),
      ),
    );

  for (const student of students) {
    const passkey = generatePasskey();

    await db
      .insert(attendancePasskeys)
      .values({
        sessionId: session.id,
        studentId: student.studentId,
        passkeyHash: await hashPasskey(passkey),
        passkeyCiphertext: encryptPasskey(passkey),
        expiresAt: session.finalClosesAt,
        used: false,
      })
      .onConflictDoUpdate({
        target: [attendancePasskeys.sessionId, attendancePasskeys.studentId],
        set: {
          passkeyHash: await hashPasskey(passkey),
          passkeyCiphertext: encryptPasskey(passkey),
          expiresAt: session.finalClosesAt,
          used: false,
          usedAt: null,
          regeneratedAt: new Date(),
          updatedAt: new Date(),
        },
      });
  }

  await db.insert(auditLogs).values({
    userId: user.id,
    action: "passkeys_generated",
    entityType: "attendance_session",
    entityId: session.id,
    newValue: { count: students.length },
  });

  revalidatePath(`/lecturer/sessions/${session.id}`);
  redirect(`/lecturer/sessions/${session.id}?passkeys=${students.length}`);
}

export async function approveAttemptAction(formData: FormData) {
  const user = await requireRole("lecturer");
  const attemptId = cleanString(formData.get("attemptId"));

  if (!user.lecturerProfileId || !attemptId) {
    redirect("/lecturer/sessions");
  }

  const db = getDb();
  const [attempt] = await db
    .select({
      id: attendanceAttempts.id,
      sessionId: attendanceAttempts.sessionId,
      studentId: attendanceAttempts.studentId,
      studentLatitude: attendanceAttempts.studentLatitude,
      studentLongitude: attendanceAttempts.studentLongitude,
      locationAccuracyMeters: attendanceAttempts.locationAccuracyMeters,
      calculatedDistanceMeters: attendanceAttempts.calculatedDistanceMeters,
      lecturerId: attendanceSessions.lecturerId,
    })
    .from(attendanceAttempts)
    .innerJoin(
      attendanceSessions,
      eq(attendanceAttempts.sessionId, attendanceSessions.id),
    )
    .where(eq(attendanceAttempts.id, attemptId))
    .limit(1);

  if (!attempt || attempt.lecturerId !== user.lecturerProfileId || !attempt.studentId) {
    redirect("/lecturer/sessions");
  }

  await db
    .insert(attendanceRecords)
    .values({
      sessionId: attempt.sessionId,
      studentId: attempt.studentId,
      checkInAt: new Date(),
      studentLatitude: attempt.studentLatitude,
      studentLongitude: attempt.studentLongitude,
      locationAccuracyMeters: attempt.locationAccuracyMeters,
      calculatedDistanceMeters: attempt.calculatedDistanceMeters,
      status: "manually_present",
      verificationMethod: "manual",
      lecturerRemarks: cleanString(formData.get("remarks")) || null,
    })
    .onConflictDoUpdate({
      target: [attendanceRecords.sessionId, attendanceRecords.studentId],
      set: {
        status: "manually_present",
        verificationMethod: "manual",
        lecturerRemarks: cleanString(formData.get("remarks")) || null,
        updatedAt: new Date(),
      },
    });

  await db
    .update(attendanceAttempts)
    .set({
      reviewStatus: "approved",
      reviewedByLecturerId: user.lecturerProfileId,
      reviewedAt: new Date(),
      lecturerRemarks: cleanString(formData.get("remarks")) || null,
    })
    .where(eq(attendanceAttempts.id, attempt.id));

  await db.insert(auditLogs).values({
    userId: user.id,
    action: "attendance_attempt_approved",
    entityType: "attendance_attempt",
    entityId: attempt.id,
    reason: cleanString(formData.get("remarks")) || null,
  });

  revalidatePath(`/lecturer/sessions/${attempt.sessionId}`);
}

export async function rejectAttemptAction(formData: FormData) {
  const user = await requireRole("lecturer");
  const attemptId = cleanString(formData.get("attemptId"));

  if (!user.lecturerProfileId || !attemptId) {
    redirect("/lecturer/sessions");
  }

  const db = getDb();
  const [attempt] = await db
    .select({
      id: attendanceAttempts.id,
      sessionId: attendanceAttempts.sessionId,
      lecturerId: attendanceSessions.lecturerId,
    })
    .from(attendanceAttempts)
    .innerJoin(
      attendanceSessions,
      eq(attendanceAttempts.sessionId, attendanceSessions.id),
    )
    .where(eq(attendanceAttempts.id, attemptId))
    .limit(1);

  if (!attempt || attempt.lecturerId !== user.lecturerProfileId) {
    redirect("/lecturer/sessions");
  }

  await db
    .update(attendanceAttempts)
    .set({
      reviewStatus: "rejected",
      reviewedByLecturerId: user.lecturerProfileId,
      reviewedAt: new Date(),
      lecturerRemarks: cleanString(formData.get("remarks")) || null,
    })
    .where(eq(attendanceAttempts.id, attempt.id));

  await db.insert(auditLogs).values({
    userId: user.id,
    action: "attendance_attempt_rejected",
    entityType: "attendance_attempt",
    entityId: attempt.id,
    reason: cleanString(formData.get("remarks")) || null,
  });

  revalidatePath(`/lecturer/sessions/${attempt.sessionId}`);
}
