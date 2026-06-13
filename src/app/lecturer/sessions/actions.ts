"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray, lte } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  attendanceAttempts,
  attendancePasskeys,
  attendanceRecords,
  attendanceSessions,
  auditLogs,
  courses,
  enrolments,
  studentAbsenceWarnings,
  studentProfiles,
  users,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { sendAbsenceWarningEmail } from "@/lib/email";
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

function editSessionErrorUrl(sessionId: string, error: string) {
  return `/lecturer/sessions/${sessionId}/edit?error=${error}`;
}

async function getConsecutiveAbsenceStreak({
  db,
  courseId,
  studentId,
  sessionDate,
}: {
  db: ReturnType<typeof getDb>;
  courseId: string;
  studentId: string;
  sessionDate: Date;
}) {
  const recentRecords = await db
    .select({
      status: attendanceRecords.status,
    })
    .from(attendanceSessions)
    .innerJoin(
      attendanceRecords,
      and(
        eq(attendanceRecords.sessionId, attendanceSessions.id),
        eq(attendanceRecords.studentId, studentId),
      ),
    )
    .where(
      and(
        eq(attendanceSessions.courseId, courseId),
        eq(attendanceSessions.status, "closed"),
        lte(attendanceSessions.sessionDate, sessionDate),
      ),
    )
    .orderBy(desc(attendanceSessions.sessionDate))
    .limit(6);

  let streak = 0;

  for (const record of recentRecords) {
    if (record.status !== "absent") {
      break;
    }

    streak += 1;
  }

  return streak;
}

async function sendAbsenceWarningsForSession({
  db,
  session,
  absentStudentIds,
}: {
  db: ReturnType<typeof getDb>;
  session: {
    id: string;
    courseId: string;
    courseCode: string;
    courseTitle: string;
    sessionDate: Date;
  };
  absentStudentIds: string[];
}) {
  const summary = {
    warningEmailsSent: 0,
    sternEmailsSent: 0,
    emailFailures: 0,
  };

  if (absentStudentIds.length === 0) {
    return summary;
  }

  const absentStudents = await db
    .select({
      studentId: studentProfiles.id,
      name: users.name,
      email: users.email,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(inArray(studentProfiles.id, absentStudentIds));

  for (const student of absentStudents) {
    const streakCount = await getConsecutiveAbsenceStreak({
      db,
      courseId: session.courseId,
      studentId: student.studentId,
      sessionDate: session.sessionDate,
    });

    if (streakCount !== 2 && streakCount !== 3) {
      continue;
    }

    const warningLevel = streakCount === 2 ? "warning" : "stern";
    const [insertedWarning] = await db
      .insert(studentAbsenceWarnings)
      .values({
        studentId: student.studentId,
        courseId: session.courseId,
        triggeringSessionId: session.id,
        streakCount,
        warningLevel,
        recipientEmail: student.email,
      })
      .onConflictDoNothing({
        target: [
          studentAbsenceWarnings.studentId,
          studentAbsenceWarnings.courseId,
          studentAbsenceWarnings.triggeringSessionId,
          studentAbsenceWarnings.warningLevel,
        ],
      })
      .returning({
        id: studentAbsenceWarnings.id,
      });

    const [warningToSend] = insertedWarning
      ? [insertedWarning]
      : await db
          .select({
            id: studentAbsenceWarnings.id,
            sent: studentAbsenceWarnings.sent,
          })
          .from(studentAbsenceWarnings)
          .where(
            and(
              eq(studentAbsenceWarnings.studentId, student.studentId),
              eq(studentAbsenceWarnings.courseId, session.courseId),
              eq(studentAbsenceWarnings.triggeringSessionId, session.id),
              eq(studentAbsenceWarnings.warningLevel, warningLevel),
              eq(studentAbsenceWarnings.sent, false),
            ),
          )
          .limit(1);

    if (!warningToSend) {
      continue;
    }

    try {
      const result = await sendAbsenceWarningEmail({
        to: student.email,
        studentName: student.name,
        courseLabel: `${session.courseCode}: ${session.courseTitle}`,
        streakCount,
      });

      if (result.sent) {
        await db
          .update(studentAbsenceWarnings)
          .set({ sent: true, sentAt: new Date(), sendError: null })
          .where(eq(studentAbsenceWarnings.id, warningToSend.id));

        if (warningLevel === "stern") {
          summary.sternEmailsSent += 1;
        } else {
          summary.warningEmailsSent += 1;
        }
      } else {
        summary.emailFailures += 1;
        await db
          .update(studentAbsenceWarnings)
          .set({ sendError: result.reason ?? "email_not_sent" })
          .where(eq(studentAbsenceWarnings.id, warningToSend.id));
      }
    } catch (error) {
      summary.emailFailures += 1;
      await db
        .update(studentAbsenceWarnings)
        .set({
          sendError:
            error instanceof Error ? error.message.slice(0, 500) : "email_send_failed",
        })
        .where(eq(studentAbsenceWarnings.id, warningToSend.id));
    }
  }

  return summary;
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

export async function updateAttendanceSessionAction(formData: FormData) {
  const user = await requireRole("lecturer");
  const sessionId = cleanString(formData.get("sessionId"));
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
    !sessionId ||
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
    redirect(sessionId ? editSessionErrorUrl(sessionId, "missing") : "/lecturer/sessions");
  }

  if (geofenceRadiusMeters < 10 || maxAcceptedAccuracyMeters < 10) {
    redirect(editSessionErrorUrl(sessionId, "missing"));
  }

  if (!isValidCoordinate(lecturerLatitude, lecturerLongitude)) {
    redirect(editSessionErrorUrl(sessionId, "location"));
  }

  if (lecturerLocationAccuracy > maxAcceptedAccuracyMeters) {
    redirect(editSessionErrorUrl(sessionId, "lecturer-accuracy"));
  }

  if (!(opensAt < normalClosesAt && normalClosesAt <= finalClosesAt)) {
    redirect(editSessionErrorUrl(sessionId, "time"));
  }

  const db = getDb();
  const [session] = await db
    .select({
      id: attendanceSessions.id,
      finalClosesAt: attendanceSessions.finalClosesAt,
    })
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

  await db
    .update(attendanceSessions)
    .set({
      sessionTitle,
      sessionDate: opensAt,
      lecturerLatitude: String(lecturerLatitude),
      lecturerLongitude: String(lecturerLongitude),
      lecturerLocationAccuracy: String(lecturerLocationAccuracy),
      geofenceRadiusMeters,
      maxAcceptedAccuracyMeters,
      opensAt,
      normalClosesAt,
      finalClosesAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(attendanceSessions.id, sessionId),
        eq(attendanceSessions.lecturerId, user.lecturerProfileId),
      ),
    );

  if (session.finalClosesAt.getTime() !== finalClosesAt.getTime()) {
    await db
      .update(attendancePasskeys)
      .set({ expiresAt: finalClosesAt, updatedAt: new Date() })
      .where(eq(attendancePasskeys.sessionId, sessionId));
  }

  await db.insert(auditLogs).values({
    userId: user.id,
    action: "attendance_session_updated",
    entityType: "attendance_session",
    entityId: sessionId,
    newValue: {
      sessionTitle,
      geofenceRadiusMeters,
      maxAcceptedAccuracyMeters,
      lecturerLocationAccuracy,
      opensAt,
      normalClosesAt,
      finalClosesAt,
    },
  });

  revalidatePath("/lecturer/sessions");
  revalidatePath(`/lecturer/sessions/${sessionId}`);
  revalidatePath(`/lecturer/sessions/${sessionId}/edit`);
  redirect(`/lecturer/sessions/${sessionId}`);
}

export async function closeAttendanceSessionAction(formData: FormData) {
  const user = await requireRole("lecturer");
  const sessionId = cleanString(formData.get("sessionId"));

  if (!user.lecturerProfileId || !sessionId) {
    redirect("/lecturer/sessions");
  }

  const db = getDb();
  const [session] = await db
    .select({
      id: attendanceSessions.id,
      courseId: attendanceSessions.courseId,
      title: attendanceSessions.sessionTitle,
      sessionDate: attendanceSessions.sessionDate,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
    })
    .from(attendanceSessions)
    .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
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

  await db
    .update(attendanceSessions)
    .set({ status: "closed", updatedAt: new Date() })
    .where(
      and(
        eq(attendanceSessions.id, sessionId),
        eq(attendanceSessions.lecturerId, user.lecturerProfileId),
      ),
    );

  const enrolledStudents = await db
    .select({ studentId: enrolments.studentId })
    .from(enrolments)
    .where(
      and(
        eq(enrolments.courseId, session.courseId),
        eq(enrolments.status, "active"),
      ),
    );

  const existingRecords = await db
    .select({ studentId: attendanceRecords.studentId })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.sessionId, session.id));

  const pendingReviewAttempts = await db
    .select({ studentId: attendanceAttempts.studentId })
    .from(attendanceAttempts)
    .where(
      and(
        eq(attendanceAttempts.sessionId, session.id),
        eq(attendanceAttempts.reviewStatus, "pending"),
      ),
    );

  const recordedStudentIds = new Set(
    existingRecords.map((record) => record.studentId),
  );
  const pendingReviewStudentIds = new Set(
    pendingReviewAttempts
      .map((attempt) => attempt.studentId)
      .filter((studentId): studentId is string => Boolean(studentId)),
  );
  const absentRows = enrolledStudents
    .filter(
      (student) =>
        !recordedStudentIds.has(student.studentId) &&
        !pendingReviewStudentIds.has(student.studentId),
    )
    .map((student) => ({
      sessionId: session.id,
      studentId: student.studentId,
      checkInAt: new Date(),
      status: "absent" as const,
      verificationMethod: "system" as const,
      lecturerRemarks: "Marked absent when session was closed.",
    }));

  if (absentRows.length > 0) {
    await db
      .insert(attendanceRecords)
      .values(absentRows)
      .onConflictDoNothing({
        target: [attendanceRecords.sessionId, attendanceRecords.studentId],
      });
  }

  const warningSummary = await sendAbsenceWarningsForSession({
    db,
    session: {
      id: session.id,
      courseId: session.courseId,
      courseCode: session.courseCode,
      courseTitle: session.courseTitle,
      sessionDate: session.sessionDate,
    },
    absentStudentIds: absentRows.map((row) => row.studentId),
  });

  await db.insert(auditLogs).values({
    userId: user.id,
    action: "attendance_session_closed",
    entityType: "attendance_session",
    entityId: session.id,
    newValue: {
      sessionTitle: session.title,
      enrolledStudents: enrolledStudents.length,
      existingRecords: existingRecords.length,
      pendingReviewsDeferred: pendingReviewStudentIds.size,
      absencesRecorded: absentRows.length,
      ...warningSummary,
    },
  });

  revalidatePath("/lecturer/sessions");
  revalidatePath(`/lecturer/sessions/${session.id}`);
  revalidatePath("/lecturer/reviews");
  revalidatePath("/lecturer/reports");
  revalidatePath("/student/sessions");
  revalidatePath("/student/attendance-history");
}

export async function deleteAttendanceSessionAction(formData: FormData) {
  const user = await requireRole("lecturer");
  const sessionId = cleanString(formData.get("sessionId"));

  if (!user.lecturerProfileId || !sessionId) {
    redirect("/lecturer/sessions");
  }

  const db = getDb();
  const [session] = await db
    .select({
      id: attendanceSessions.id,
      title: attendanceSessions.sessionTitle,
      courseId: attendanceSessions.courseId,
    })
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

  await db.insert(auditLogs).values({
    userId: user.id,
    action: "attendance_session_deleted",
    entityType: "attendance_session",
    entityId: session.id,
    previousValue: {
      courseId: session.courseId,
      sessionTitle: session.title,
    },
  });

  await db
    .delete(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.id, session.id),
        eq(attendanceSessions.lecturerId, user.lecturerProfileId),
      ),
    );

  revalidatePath("/lecturer/sessions");
  revalidatePath("/lecturer/dashboard");
  redirect("/lecturer/sessions");
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
  revalidatePath("/lecturer/reviews");
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
      studentId: attendanceAttempts.studentId,
      lecturerId: attendanceSessions.lecturerId,
      sessionStatus: attendanceSessions.status,
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

  if (attempt.studentId && attempt.sessionStatus === "closed") {
    await db
      .insert(attendanceRecords)
      .values({
        sessionId: attempt.sessionId,
        studentId: attempt.studentId,
        checkInAt: new Date(),
        status: "absent",
        verificationMethod: "manual",
        lecturerRemarks:
          cleanString(formData.get("remarks")) ||
          "Marked absent after lecturer rejected review attempt.",
      })
      .onConflictDoNothing({
        target: [attendanceRecords.sessionId, attendanceRecords.studentId],
      });
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
  revalidatePath("/lecturer/reviews");
}
