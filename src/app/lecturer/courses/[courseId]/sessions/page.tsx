import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDb } from "@/db/client";
import { attendanceSessions, courses } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function CourseSessionsPage({
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

  const sessions = await db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.courseId, course.id))
    .orderBy(desc(attendanceSessions.opensAt));
  return (
    <>
      <PageHeader
        title={`${course.courseCode} sessions`}
        description={`${course.courseTitle} / ${course.academicYear} / ${course.semester}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/lecturer/courses/${course.id}`}>Course overview</Link>
            </Button>
          </>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Opens</TableHead>
                <TableHead>Final close</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.sessionTitle}</TableCell>
                  <TableCell>{session.opensAt.toLocaleString()}</TableCell>
                  <TableCell>{session.finalClosesAt.toLocaleString()}</TableCell>
                  <TableCell>
                    <StatusBadge status={session.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/lecturer/courses/${course.id}/sessions/${session.id}`}
                      >
                        Manage
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="h-24 text-center text-muted-foreground"
                    colSpan={5}
                  >
                    No attendance sessions have been created for this course.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
