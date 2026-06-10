import { and, count, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  attendanceAttempts,
  attendanceRecords,
  attendanceSessions,
  courses,
  enrolments,
} from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requireRole } from "@/lib/auth";

export default async function LecturerDashboardPage() {
  const user = await requireRole(["lecturer", "administrator"]);
  const db = getDb();

  const lecturerId = user.lecturerProfileId ?? "";
  const [courseCount] = await db
    .select({ value: count() })
    .from(courses)
    .where(eq(courses.lecturerId, lecturerId));

  const lecturerCourses = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.lecturerId, lecturerId));
  const courseIds = lecturerCourses.map((course) => course.id);

  const [studentCount] = courseIds.length
    ? await db
        .select({ value: count() })
        .from(enrolments)
        .where(inArray(enrolments.courseId, courseIds))
    : [{ value: 0 }];

  const [openSessionCount] = await db
    .select({ value: count() })
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.lecturerId, lecturerId),
        eq(attendanceSessions.status, "open"),
      ),
    );

  const [reviewCount] = await db
    .select({ value: count() })
    .from(attendanceAttempts)
    .innerJoin(
      attendanceSessions,
      eq(attendanceAttempts.sessionId, attendanceSessions.id),
    )
    .where(
      and(
        eq(attendanceSessions.lecturerId, lecturerId),
        eq(attendanceAttempts.reviewStatus, "pending"),
      ),
    );

  const [recordCount] = await db
    .select({ value: count() })
    .from(attendanceRecords)
    .innerJoin(
      attendanceSessions,
      eq(attendanceRecords.sessionId, attendanceSessions.id),
    )
    .where(eq(attendanceSessions.lecturerId, lecturerId));

  return (
    <>
      <PageHeader
        title="Lecturer dashboard"
        description="Overview of courses, enrolments, active attendance sessions, and submissions needing review."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Courses" value={courseCount.value} tone="info" />
        <StatCard label="Enrolled students" value={studentCount.value} />
        <StatCard label="Open sessions" value={openSessionCount.value} tone="success" />
        <StatCard label="Attendance records" value={recordCount.value} />
        <StatCard label="Awaiting review" value={reviewCount.value} tone="warning" />
      </div>
    </>
  );
}
