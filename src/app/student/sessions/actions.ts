"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  attendanceAttempts,
  attendanceRecords,
  attendanceSessions,
  courses,
  enrolments,
} from "@/db/schema";
import { verifyAttendanceQrToken } from "@/lib/attendance-qr";
import { requireRole } from "@/lib/auth";
import {
  getSecurityRequestContext,
  isSecurityRateLimited,
  recordSecurityEvent,
  securityWindows,
} from "@/lib/security";

export type QrCheckInResult = {
  ok: boolean;
  status:
    | "present"
    | "late"
    | "duplicate"
    | "invalid"
    | "expired"
    | "closed"
    | "not_enrolled"
    | "rate_limited"
    | "unavailable";
  message: string;
  sessionLabel?: string;
};

export async function checkInWithQrAction(
  token: string,
): Promise<QrCheckInResult> {
  const user = await requireRole("student");
  const studentId = user.studentProfileId;
  const securityContext = await getSecurityRequestContext();

  if (!studentId) {
    return {
      ok: false,
      status: "unavailable",
      message: "Your student profile is not ready for attendance.",
    };
  }

  const verification = verifyAttendanceQrToken(token);

  if (!verification.valid) {
    await recordSecurityEvent({
      eventType: "attendance_qr_rejected",
      identifier: `qr-attendance:${studentId}`,
      context: securityContext,
      metadata: { reason: verification.reason },
    });

    return verification.reason === "expired_qr"
      ? {
          ok: false,
          status: "expired",
          message: "That QR code has expired. Scan the newly displayed code.",
        }
      : {
          ok: false,
          status: "invalid",
          message: "This is not a valid attendance QR code.",
        };
  }

  const sessionId = verification.sessionId;
  const db = getDb();
  const [session] = await db
    .select({
      id: attendanceSessions.id,
      courseId: attendanceSessions.courseId,
      status: attendanceSessions.status,
      opensAt: attendanceSessions.opensAt,
      normalClosesAt: attendanceSessions.normalClosesAt,
      finalClosesAt: attendanceSessions.finalClosesAt,
      sessionTitle: attendanceSessions.sessionTitle,
      courseCode: courses.courseCode,
    })
    .from(attendanceSessions)
    .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
    .where(eq(attendanceSessions.id, sessionId))
    .limit(1);

  if (!session) {
    return {
      ok: false,
      status: "invalid",
      message: "This attendance session no longer exists.",
    };
  }

  const sessionLabel = `${session.courseCode}: ${session.sessionTitle}`;

  async function logAttempt(
    result: "accepted" | "late" | "rejected",
    rejectionReason:
      | "invalid_qr"
      | "expired_qr"
      | "session_closed"
      | "student_not_enrolled"
      | "duplicate_attendance"
      | "too_many_attempts"
      | null,
  ) {
    await db.insert(attendanceAttempts).values({
      sessionId,
      studentId,
      result,
      rejectionReason,
      reviewStatus: "not_required",
      ipAddress: securityContext.ipAddress,
      userAgent: securityContext.userAgent,
    });

    if (result === "rejected") {
      const events = [
        recordSecurityEvent({
          eventType: "attendance_qr_rejected",
          identifier: `qr-attendance:${sessionId}:${studentId}`,
          context: securityContext,
          metadata: { rejectionReason },
        }),
      ];

      if (securityContext.ipAddress) {
        events.push(
          recordSecurityEvent({
            eventType: "attendance_qr_rejected",
            identifier: `qr-attendance-ip:${securityContext.ipAddress}`,
            context: securityContext,
            metadata: { rejectionReason },
          }),
        );
      }

      await Promise.all(events);
    }
  }

  const [studentBlocked, ipBlocked] = await Promise.all([
    isSecurityRateLimited({
      eventType: "attendance_qr_rejected",
      identifier: `qr-attendance:${sessionId}:${studentId}`,
      limit: 8,
      windowMs: securityWindows.standard,
    }),
    isSecurityRateLimited({
      eventType: "attendance_qr_rejected",
      identifier: `qr-attendance-ip:${securityContext.ipAddress ?? "unknown"}`,
      limit: 60,
      windowMs: securityWindows.standard,
    }),
  ]);

  if (studentBlocked || ipBlocked) {
    await logAttempt("rejected", "too_many_attempts");
    return {
      ok: false,
      status: "rate_limited",
      message: "Too many unsuccessful scans. Wait briefly and try again.",
      sessionLabel,
    };
  }

  const now = new Date();

  if (
    session.status !== "open" ||
    now < session.opensAt ||
    now > session.finalClosesAt
  ) {
    await logAttempt("rejected", "session_closed");
    return {
      ok: false,
      status: "closed",
      message: "This attendance session is not open.",
      sessionLabel,
    };
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
    return {
      ok: false,
      status: "not_enrolled",
      message: "You are not enrolled in the course for this QR code.",
      sessionLabel,
    };
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
    return {
      ok: false,
      status: "duplicate",
      message: "Your attendance has already been recorded for this session.",
      sessionLabel,
    };
  }

  const status = now <= session.normalClosesAt ? "present" : "late";
  const [record] = await db
    .insert(attendanceRecords)
    .values({
      sessionId,
      studentId,
      checkInAt: now,
      status,
      verificationMethod: "rotating_qr",
    })
    .onConflictDoNothing({
      target: [attendanceRecords.sessionId, attendanceRecords.studentId],
    })
    .returning({ id: attendanceRecords.id });

  if (!record) {
    await logAttempt("rejected", "duplicate_attendance");
    return {
      ok: false,
      status: "duplicate",
      message: "Your attendance has already been recorded for this session.",
      sessionLabel,
    };
  }

  await Promise.all([
    logAttempt(status === "present" ? "accepted" : "late", null),
    recordSecurityEvent({
      eventType: "attendance_qr_success",
      identifier: `qr-attendance:${sessionId}:${studentId}`,
      context: securityContext,
      success: true,
      metadata: { status },
    }),
  ]);

  revalidatePath("/student/dashboard");
  revalidatePath("/student/sessions");
  revalidatePath("/student/attendance-history");
  revalidatePath(`/lecturer/sessions/${sessionId}`);
  revalidatePath(`/lecturer/courses/${session.courseId}/sessions/${sessionId}`);

  return {
    ok: true,
    status,
    message:
      status === "present"
        ? "Attendance recorded successfully."
        : "Attendance recorded as late.",
    sessionLabel,
  };
}
