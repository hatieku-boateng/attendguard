import { and, count, eq, inArray } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getDb } from "@/db/client";
import {
  attendanceRecords,
  attendanceSessions,
  courses,
  enrolments,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function StudentDashboardPage() {
  const user = await requireRole("student");
  const db = getDb();
  const studentId = user.studentProfileId ?? "";

  const studentEnrolments = await db
    .select({ courseId: enrolments.courseId })
    .from(enrolments)
    .where(
      and(eq(enrolments.studentId, studentId), eq(enrolments.status, "active")),
    );
  const courseIds = studentEnrolments.map((enrolment) => enrolment.courseId);

  const [classCount] = courseIds.length
    ? await db
        .select({ value: count() })
        .from(courses)
        .where(inArray(courses.id, courseIds))
    : [{ value: 0 }];

  const [activeSessionCount] = courseIds.length
    ? await db
        .select({ value: count() })
        .from(attendanceSessions)
        .where(
          and(
            inArray(attendanceSessions.courseId, courseIds),
            eq(attendanceSessions.status, "open"),
          ),
        )
    : [{ value: 0 }];

  const [attendanceCount] = await db
    .select({ value: count() })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.studentId, studentId));

  return (
    <>
      <PageHeader
        title="Student dashboard"
        description="Your registered classes, active attendance sessions, and recorded attendance history."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Registered classes" value={classCount.value} tone="info" />
        <StatCard label="Active sessions" value={activeSessionCount.value} tone="success" />
        <StatCard label="Recorded attendance" value={attendanceCount.value} />
      </div>
    </>
  );
}
