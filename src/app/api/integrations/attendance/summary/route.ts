import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  attendanceRecords,
  attendanceSessions,
  courses,
  studentProfiles,
  users,
} from "@/db/schema";
import { requireIntegrationRequest } from "@/lib/integration-auth";

export async function GET(request: NextRequest) {
  const auth = requireIntegrationRequest(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const courseExternalId = searchParams.get("courseExternalId")?.trim() ?? "";
  const studentExternalId = searchParams.get("studentExternalId")?.trim() ?? "";
  const db = getDb();

  const filters = [];
  if (courseExternalId) {
    filters.push(eq(courses.externalId, courseExternalId));
    filters.push(eq(courses.sourceSystem, auth.context.sourceSystem));
  }
  if (studentExternalId) {
    filters.push(eq(studentProfiles.externalId, studentExternalId));
    filters.push(eq(studentProfiles.sourceSystem, auth.context.sourceSystem));
  }

  const rows = await db
    .select({
      courseExternalId: courses.externalId,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
      sessionId: attendanceSessions.id,
      sessionTitle: attendanceSessions.sessionTitle,
      sessionDate: attendanceSessions.sessionDate,
      studentExternalId: studentProfiles.externalId,
      studentIdNumber: studentProfiles.studentIdNumber,
      studentName: users.name,
      status: attendanceRecords.status,
      checkInAt: attendanceRecords.checkInAt,
      distanceMeters: attendanceRecords.calculatedDistanceMeters,
      accuracyMeters: attendanceRecords.locationAccuracyMeters,
      verificationMethod: attendanceRecords.verificationMethod,
    })
    .from(attendanceRecords)
    .innerJoin(attendanceSessions, eq(attendanceRecords.sessionId, attendanceSessions.id))
    .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
    .innerJoin(studentProfiles, eq(attendanceRecords.studentId, studentProfiles.id))
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(filters.length > 0 ? and(...filters) : undefined);

  const summary = new Map<
    string,
    {
      studentExternalId: string | null;
      studentIdNumber: string;
      studentName: string;
      courseExternalId: string | null;
      courseCode: string;
      sessionsHeld: number;
      present: number;
      late: number;
      manuallyPresent: number;
      absent: number;
    }
  >();

  for (const row of rows) {
    const key = `${row.courseCode}:${row.studentIdNumber}`;
    const current =
      summary.get(key) ??
      {
        studentExternalId: row.studentExternalId,
        studentIdNumber: row.studentIdNumber,
        studentName: row.studentName,
        courseExternalId: row.courseExternalId,
        courseCode: row.courseCode,
        sessionsHeld: 0,
        present: 0,
        late: 0,
        manuallyPresent: 0,
        absent: 0,
      };

    current.sessionsHeld += 1;
    if (row.status === "present") current.present += 1;
    if (row.status === "late") current.late += 1;
    if (row.status === "manually_present") current.manuallyPresent += 1;
    if (row.status === "absent") current.absent += 1;
    summary.set(key, current);
  }

  return NextResponse.json({
    sourceSystem: auth.context.sourceSystem,
    count: rows.length,
    records: rows,
    summary: Array.from(summary.values()).map((item) => {
      const credited = item.present + item.late + item.manuallyPresent;
      return {
        ...item,
        credited,
        attendanceRate:
          item.sessionsHeld > 0 ? Number(((credited / item.sessionsHeld) * 100).toFixed(2)) : 0,
      };
    }),
  });
}
