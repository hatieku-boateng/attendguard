import Link from "next/link";
import { and, count, eq } from "drizzle-orm";

import { updateCourseStatusAction } from "@/app/lecturer/courses/actions";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db/client";
import { attendanceSessions, courses, enrolments } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const user = await requireRole("lecturer");
  const db = getDb();

  const [course] = await db
    .select()
    .from(courses)
    .where(
      and(
        eq(courses.id, courseId),
        eq(courses.lecturerId, user.lecturerProfileId ?? ""),
      ),
    )
    .limit(1);

  if (!course) {
    return <PageHeader title="Course not found" />;
  }

  const [studentCount] = await db
    .select({ value: count() })
    .from(enrolments)
    .where(eq(enrolments.courseId, course.id));

  const [sessionCount] = await db
    .select({ value: count() })
    .from(attendanceSessions)
    .where(eq(attendanceSessions.courseId, course.id));

  return (
    <>
      <PageHeader
        title={`${course.courseCode}: ${course.courseTitle}`}
        description={`${course.academicYear} / ${course.semester} / ${course.classGroup}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/lecturer/courses/${course.id}/students`}>Students</Link>
            </Button>
            <Button asChild>
              <Link href={`/lecturer/sessions/new?courseId=${course.id}`}>
                Start session
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Students enrolled" value={studentCount.value} />
        <StatCard label="Attendance sessions" value={sessionCount.value} />
        <StatCard label="Status" value={course.status} />
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Course details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Programme:</span>{" "}
            {course.programme || "Not set"}
          </p>
          <p>
            <span className="text-muted-foreground">Level:</span>{" "}
            {course.level || "Not set"}
          </p>
          <p>
            <span className="text-muted-foreground">Class group:</span>{" "}
            {course.classGroup}
          </p>
          <p>
            <span className="text-muted-foreground">Current status:</span>{" "}
            <Badge variant="secondary">{course.status}</Badge>
          </p>
          <form action={updateCourseStatusAction} className="flex gap-2 sm:col-span-2">
            <input name="courseId" type="hidden" value={course.id} />
            <Button name="status" type="submit" value="active" variant="outline">
              Mark active
            </Button>
            <Button name="status" type="submit" value="archived" variant="outline">
              Archive
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
