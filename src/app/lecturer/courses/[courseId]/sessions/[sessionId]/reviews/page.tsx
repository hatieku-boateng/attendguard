import Link from "next/link";
import { and, desc, eq, ne } from "drizzle-orm";

import {
  approveAttemptAction,
  rejectAttemptAction,
} from "@/app/lecturer/sessions/actions";
import { PageHeader } from "@/components/page-header";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
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

type ReviewAttempt = {
  id: string;
  name: string | null;
  studentIdNumber: string | null;
  result: "accepted" | "late" | "rejected" | "requires_review";
  reason:
    | "invalid_qr"
    | "expired_qr"
    | "session_closed"
    | "student_not_enrolled"
    | "duplicate_attendance"
    | "account_mismatch"
    | "too_many_attempts"
    | null;
  reviewStatus: "not_required" | "pending" | "approved" | "rejected";
  attemptedAt: Date;
};

function AttemptsTable({
  attempts,
  showActions,
}: {
  attempts: ReviewAttempt[];
  showActions: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          <TableHead>Flag</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Review status</TableHead>
          <TableHead>Attempted</TableHead>
          {showActions ? <TableHead className="text-right">Decision</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {attempts.map((attempt) => (
          <TableRow key={attempt.id}>
            <TableCell>
              <p className="font-medium">{attempt.name ?? "Unknown student"}</p>
              <p className="text-xs text-muted-foreground">
                {attempt.studentIdNumber ?? "No student ID"}
              </p>
            </TableCell>
            <TableCell>
              <StatusBadge status={attempt.reason ?? attempt.result} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">QR scan</TableCell>
            <TableCell>
              <StatusBadge status={attempt.reviewStatus} />
            </TableCell>
            <TableCell>{attempt.attemptedAt.toLocaleString()}</TableCell>
            {showActions ? (
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
            ) : null}
          </TableRow>
        ))}
        {attempts.length === 0 ? (
          <TableRow>
            <TableCell
              className="h-24 text-center text-muted-foreground"
              colSpan={showActions ? 6 : 5}
            >
              No attempts in this section.
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
    </Table>
  );
}

export default async function SessionReviewsPage({
  params,
}: {
  params: Promise<{ courseId: string; sessionId: string }>;
}) {
  const { courseId, sessionId } = await params;
  const user = await requireRole("lecturer");
  const db = getDb();

  const [session] = await db
    .select({
      id: attendanceSessions.id,
      title: attendanceSessions.sessionTitle,
      courseId: attendanceSessions.courseId,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
    })
    .from(attendanceSessions)
    .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
    .where(
      and(
        eq(attendanceSessions.id, sessionId),
        eq(attendanceSessions.courseId, courseId),
        eq(attendanceSessions.lecturerId, user.lecturerProfileId ?? ""),
      ),
    )
    .limit(1);

  if (!session) {
    return <PageHeader title="Session not found" />;
  }

  const baseSelect = {
    id: attendanceAttempts.id,
    name: users.name,
    studentIdNumber: studentProfiles.studentIdNumber,
    result: attendanceAttempts.result,
    reason: attendanceAttempts.rejectionReason,
    reviewStatus: attendanceAttempts.reviewStatus,
    attemptedAt: attendanceAttempts.attemptedAt,
  };

  const [pendingAttempts, reviewedAttempts] = await Promise.all([
    db
      .select(baseSelect)
      .from(attendanceAttempts)
      .leftJoin(studentProfiles, eq(attendanceAttempts.studentId, studentProfiles.id))
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .where(
        and(
          eq(attendanceAttempts.sessionId, session.id),
          eq(attendanceAttempts.reviewStatus, "pending"),
        ),
      )
      .orderBy(desc(attendanceAttempts.attemptedAt)),
    db
      .select(baseSelect)
      .from(attendanceAttempts)
      .leftJoin(studentProfiles, eq(attendanceAttempts.studentId, studentProfiles.id))
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .where(
        and(
          eq(attendanceAttempts.sessionId, session.id),
          ne(attendanceAttempts.reviewStatus, "pending"),
          ne(attendanceAttempts.reviewStatus, "not_required"),
        ),
      )
      .orderBy(desc(attendanceAttempts.attemptedAt)),
  ]);

  return (
    <>
      <PageHeader
        title="Session reviews"
        description={`${session.courseCode}: ${session.courseTitle} / ${session.title}`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/lecturer/courses/${courseId}/sessions/${session.id}`}>
              Back to session
            </Link>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Pending approval</CardTitle>
          <CardDescription>
            These attempts still need lecturer action. Approving one student clears
            all pending attempts for that same student in this session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttemptsTable attempts={pendingAttempts} showActions />
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Reviewed attempts</CardTitle>
          <CardDescription>
            This keeps the attempt history visible without mixing it into pending approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttemptsTable attempts={reviewedAttempts} showActions={false} />
        </CardContent>
      </Card>
    </>
  );
}
