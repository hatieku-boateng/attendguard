import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  attendanceAttempts,
  attendanceRecords,
  attendanceSessions,
  courses,
  lecturerProfiles,
  studentProfiles,
  users,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

function csvCell(value: unknown) {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");

  return `"${text.replaceAll('"', '""')}"`;
}

function csvRow(values: unknown[]) {
  return values.map(csvCell).join(",");
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user || user.status !== "active" || !["lecturer", "administrator"].includes(user.role)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const courseId = request.nextUrl.searchParams.get("courseId");
  const db = getDb();
  const lecturerId = user.lecturerProfileId ?? "";

  const recordRows = await db
    .select({
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
      sessionTitle: attendanceSessions.sessionTitle,
      sessionDate: attendanceSessions.sessionDate,
      studentName: users.name,
      studentIdNumber: studentProfiles.studentIdNumber,
      checkInAt: attendanceRecords.checkInAt,
      status: attendanceRecords.status,
      distance: attendanceRecords.calculatedDistanceMeters,
      accuracy: attendanceRecords.locationAccuracyMeters,
      rejectionReason: attendanceAttempts.rejectionReason,
      remarks: attendanceRecords.lecturerRemarks,
    })
    .from(attendanceRecords)
    .innerJoin(attendanceSessions, eq(attendanceRecords.sessionId, attendanceSessions.id))
    .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
    .innerJoin(lecturerProfiles, eq(courses.lecturerId, lecturerProfiles.id))
    .innerJoin(studentProfiles, eq(attendanceRecords.studentId, studentProfiles.id))
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .leftJoin(
      attendanceAttempts,
      and(
        eq(attendanceAttempts.sessionId, attendanceRecords.sessionId),
        eq(attendanceAttempts.studentId, attendanceRecords.studentId),
      ),
    )
    .where(
      courseId
        ? and(eq(courses.lecturerId, lecturerId), eq(courses.id, courseId))
        : eq(courses.lecturerId, lecturerId),
    );

  const headers = [
    "Course code",
    "Course title",
    "Session",
    "Session date",
    "Student name",
    "Student ID",
    "Check-in time",
    "Attendance status",
    "Distance metres",
    "Location accuracy metres",
    "Rejection reason",
    "Lecturer remarks",
  ];

  const csv = [
    csvRow(headers),
    ...recordRows.map((row) =>
      csvRow([
        row.courseCode,
        row.courseTitle,
        row.sessionTitle,
        row.sessionDate,
        row.studentName,
        row.studentIdNumber,
        row.checkInAt,
        row.status,
        row.distance,
        row.accuracy,
        row.rejectionReason,
        row.remarks,
      ]),
    ),
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Disposition": 'attachment; filename="attendance-report.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
