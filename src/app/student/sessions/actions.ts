"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  attendanceAttempts,
  attendancePasskeys,
  attendanceRecords,
  attendanceSessions,
  enrolments,
} from "@/db/schema";
import { calculateDistanceMeters, isValidCoordinate } from "@/lib/geo";
import { requireRole } from "@/lib/auth";
import { verifyPasskey } from "@/lib/passkeys";

function cleanString(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseNumber(value: FormDataEntryValue | null) {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function resultUrl(sessionId: string, result: string) {
  return `/student/check-in/${sessionId}?result=${result}`;
}

export async function checkInAction(formData: FormData) {
  const user = await requireRole("student");
  const studentId = user.studentProfileId;
  const sessionId = cleanString(formData.get("sessionId"));
  const enteredPasskey = cleanString(formData.get("passkey"));
  const studentLatitude = parseNumber(formData.get("studentLatitude"));
  const studentLongitude = parseNumber(formData.get("studentLongitude"));
  const locationAccuracyMeters = parseNumber(formData.get("locationAccuracy"));

  if (!studentId || !sessionId) {
    redirect("/student/sessions");
  }

  const db = getDb();
  const [session] = await db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.id, sessionId))
    .limit(1);

  async function logAttempt(
    result: "accepted" | "late" | "rejected" | "requires_review",
    rejectionReason:
      | "invalid_passkey"
      | "expired_passkey"
      | "passkey_already_used"
      | "outside_permitted_area"
      | "poor_location_accuracy"
      | "session_closed"
      | "student_not_enrolled"
      | "duplicate_attendance"
      | "location_permission_denied"
      | "account_mismatch"
      | "invalid_location"
      | "too_many_attempts"
      | null,
    distance?: number,
  ) {
    await db.insert(attendanceAttempts).values({
      sessionId,
      studentId,
      studentLatitude: studentLatitude === null ? null : String(studentLatitude),
      studentLongitude: studentLongitude === null ? null : String(studentLongitude),
      locationAccuracyMeters:
        locationAccuracyMeters === null ? null : String(locationAccuracyMeters),
      calculatedDistanceMeters: distance === undefined ? null : String(distance.toFixed(2)),
      result,
      rejectionReason,
      reviewStatus: result === "requires_review" ? "pending" : "not_required",
    });
  }

  if (!session) {
    redirect("/student/sessions");
  }

  const [enrolment] = await db
    .select({ id: enrolments.id })
    .from(enrolments)
    .where(
      and(
        eq(enrolments.courseId, session.courseId),
        eq(enrolments.studentId, studentId),
        eq(enrolments.status, "active"),
      ),
    )
    .limit(1);

  if (!enrolment) {
    await logAttempt("rejected", "student_not_enrolled");
    redirect(resultUrl(sessionId, "not-enrolled"));
  }

  const now = new Date();

  if (session.status !== "open" || now < session.opensAt || now > session.finalClosesAt) {
    await logAttempt("rejected", "session_closed");
    redirect(resultUrl(sessionId, "closed"));
  }

  const [failedAttempts] = await db
    .select({ value: count() })
    .from(attendanceAttempts)
    .where(
      and(
        eq(attendanceAttempts.sessionId, sessionId),
        eq(attendanceAttempts.studentId, studentId),
        eq(attendanceAttempts.result, "rejected"),
      ),
    );

  if (failedAttempts.value >= 5) {
    await logAttempt("rejected", "too_many_attempts");
    redirect(resultUrl(sessionId, "too-many"));
  }

  const [existingRecord] = await db
    .select({ id: attendanceRecords.id })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.sessionId, sessionId),
        eq(attendanceRecords.studentId, studentId),
      ),
    )
    .limit(1);

  if (existingRecord) {
    await logAttempt("rejected", "duplicate_attendance");
    redirect(resultUrl(sessionId, "duplicate"));
  }

  const [passkey] = await db
    .select()
    .from(attendancePasskeys)
    .where(
      and(
        eq(attendancePasskeys.sessionId, sessionId),
        eq(attendancePasskeys.studentId, studentId),
      ),
    )
    .limit(1);

  if (!passkey || !(await verifyPasskey(enteredPasskey, passkey.passkeyHash))) {
    await logAttempt("rejected", "invalid_passkey");
    redirect(resultUrl(sessionId, "invalid-passkey"));
  }

  if (passkey.used) {
    await logAttempt("rejected", "passkey_already_used");
    redirect(resultUrl(sessionId, "passkey-used"));
  }

  if (passkey.expiresAt < now) {
    await logAttempt("rejected", "expired_passkey");
    redirect(resultUrl(sessionId, "expired-passkey"));
  }

  if (
    studentLatitude === null ||
    studentLongitude === null ||
    locationAccuracyMeters === null
  ) {
    await logAttempt("rejected", "location_permission_denied");
    redirect(resultUrl(sessionId, "location-required"));
  }

  if (!isValidCoordinate(studentLatitude, studentLongitude)) {
    await logAttempt("rejected", "invalid_location");
    redirect(resultUrl(sessionId, "invalid-location"));
  }

  const distance = calculateDistanceMeters({
    fromLatitude: Number(session.lecturerLatitude),
    fromLongitude: Number(session.lecturerLongitude),
    toLatitude: studentLatitude,
    toLongitude: studentLongitude,
  });

  if (locationAccuracyMeters > session.maxAcceptedAccuracyMeters) {
    await logAttempt("requires_review", "poor_location_accuracy", distance);
    redirect(resultUrl(sessionId, "review"));
  }

  if (distance > session.geofenceRadiusMeters + locationAccuracyMeters) {
    await logAttempt("rejected", "outside_permitted_area", distance);
    redirect(resultUrl(sessionId, "outside"));
  }

  if (distance > session.geofenceRadiusMeters) {
    await logAttempt("requires_review", "outside_permitted_area", distance);
    redirect(resultUrl(sessionId, "review"));
  }

  const status = now <= session.normalClosesAt ? "present" : "late";

  await db.transaction(async (tx) => {
    await tx
      .update(attendancePasskeys)
      .set({ used: true, usedAt: now, updatedAt: now })
      .where(eq(attendancePasskeys.id, passkey.id));

    await tx.insert(attendanceRecords).values({
      sessionId,
      studentId,
      checkInAt: now,
      studentLatitude: String(studentLatitude),
      studentLongitude: String(studentLongitude),
      locationAccuracyMeters: String(locationAccuracyMeters),
      calculatedDistanceMeters: String(distance.toFixed(2)),
      status,
      verificationMethod: "passkey_location",
    });
  });

  await logAttempt(status === "present" ? "accepted" : "late", null, distance);

  revalidatePath("/student/sessions");
  revalidatePath("/student/attendance-history");
  redirect(resultUrl(sessionId, status));
}
