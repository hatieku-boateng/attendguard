import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";

import {
  approveAttemptAction,
  rejectAttemptAction,
} from "@/app/lecturer/sessions/actions";
import { PageHeader } from "@/components/page-header";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDb } from "@/db/client";
import {
  attendanceAttempts,
  attendanceSessions,
  courses,
  studentProfiles,
  users,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function LecturerReviewsPage() {
  const user = await requireRole("lecturer");
  const db = getDb();

  const pendingAttempts = await db
    .select({
      id: attendanceAttempts.id,
      sessionId: attendanceAttempts.sessionId,
      courseId: attendanceSessions.courseId,
      sessionTitle: attendanceSessions.sessionTitle,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
      name: users.name,
      studentIdNumber: studentProfiles.studentIdNumber,
      result: attendanceAttempts.result,
      reason: attendanceAttempts.rejectionReason,
      attemptedAt: attendanceAttempts.attemptedAt,
      distance: attendanceAttempts.calculatedDistanceMeters,
      accuracy: attendanceAttempts.locationAccuracyMeters,
    })
    .from(attendanceAttempts)
    .innerJoin(
      attendanceSessions,
      eq(attendanceAttempts.sessionId, attendanceSessions.id),
    )
    .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
    .leftJoin(studentProfiles, eq(attendanceAttempts.studentId, studentProfiles.id))
    .leftJoin(users, eq(studentProfiles.userId, users.id))
    .where(
      and(
        eq(attendanceSessions.lecturerId, user.lecturerProfileId ?? ""),
        eq(attendanceAttempts.reviewStatus, "pending"),
      ),
    )
    .orderBy(desc(attendanceAttempts.attemptedAt));

  return (
    <>
      <PageHeader
        title="Attendance reviews"
        description="Approve or reject flagged attendance attempts before they become final records."
      />
      <Card>
        <CardHeader>
          <CardTitle>Pending review queue</CardTitle>
          <CardDescription>
            Attempts appear here when passkey, location, duplicate, or repeated
            submission safeguards require lecturer judgement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course / session</TableHead>
                <TableHead>Flag</TableHead>
                <TableHead>GPS</TableHead>
                <TableHead>Attempted</TableHead>
                <TableHead className="text-right">Decision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingAttempts.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell>
                    <p className="font-medium">
                      {attempt.name ?? "Unknown student"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {attempt.studentIdNumber ?? "No student ID"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">
                      {attempt.courseCode}: {attempt.courseTitle}
                    </p>
                    <Link
                      className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                      href={`/lecturer/courses/${attempt.courseId}/sessions/${attempt.sessionId}/reviews`}
                    >
                      {attempt.sessionTitle}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{attempt.reason ?? attempt.result}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <p>Distance: {attempt.distance ?? "-"}m</p>
                    <p>Accuracy: {attempt.accuracy ?? "-"}m</p>
                  </TableCell>
                  <TableCell>{attempt.attemptedAt.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      <form action={approveAttemptAction}>
                        <input name="attemptId" type="hidden" value={attempt.id} />
                        <PendingSubmitButton pendingLabel="Approving..." size="sm">
                          Approve
                        </PendingSubmitButton>
                      </form>
                      <form action={rejectAttemptAction}>
                        <input name="attemptId" type="hidden" value={attempt.id} />
                        <PendingSubmitButton
                          pendingLabel="Rejecting..."
                          size="sm"
                          variant="outline"
                        >
                          Reject
                        </PendingSubmitButton>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {pendingAttempts.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="h-28 text-center text-muted-foreground"
                    colSpan={6}
                  >
                    No attendance attempts are awaiting review.
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
