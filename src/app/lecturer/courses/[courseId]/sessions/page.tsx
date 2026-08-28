import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { AttendanceSessionFields } from "@/components/attendance-session-fields";
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
import { attendanceSessions, courses, lectureHalls } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { FormModal } from "@/components/form-modal";
import { Label } from "@/components/ui/label";
import { createAttendanceSessionAction } from "@/app/lecturer/sessions/actions";

export default async function CourseSessionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ modal?: string; error?: string }>;
}) {
  const { courseId } = await params;
  const query = await searchParams;
  const user = await requireRole("lecturer");
  const db = getDb();

  const errorMessages: Record<string, string> = {
    time: "Opening time must be before normal close, and normal close must be before final close.",
    venue: "Select a valid lecture hall or leave the venue blank.",
    missing: "Complete the session title and attendance times.",
  };

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
  const mappedLectureHalls = await db
    .select()
    .from(lectureHalls)
    .where(eq(lectureHalls.status, "active"))
    .orderBy(lectureHalls.code);
  const sessionVenues = mappedLectureHalls.map((hall) => ({
    id: hall.id,
    code: hall.code,
    name: hall.name,
  }));

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
            <Button asChild>
              <Link href={`/lecturer/courses/${course.id}/sessions?modal=new`}>
                <Plus className="size-4" />
                New session
              </Link>
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

      {/* Start Session Modal */}
      <FormModal
        isOpen={query.modal === "new"}
        title="Start attendance session"
        description="Choose the attendance window. The rotating QR becomes available automatically."
        className="sm:max-w-2xl"
      >
        <form action={createAttendanceSessionAction} className="grid gap-4 sm:grid-cols-2 pt-2">
          <input name="courseId" type="hidden" value={course.id} />
          <input name="source" type="hidden" value="course" />
          {query.error && errorMessages[query.error] ? (
            <p className="sm:col-span-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed">
              {errorMessages[query.error]}
            </p>
          ) : null}
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Course</Label>
            <div className="rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground font-semibold">
              {course.courseCode}: {course.courseTitle}
            </div>
          </div>
          <AttendanceSessionFields venues={sessionVenues} />
          <div className="sm:col-span-2 pt-2">
            <Button className="w-full py-5 rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg text-sm" type="submit">
              Open attendance session
            </Button>
          </div>
        </form>
      </FormModal>
    </>
  );
}
