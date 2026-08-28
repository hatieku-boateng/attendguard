import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";

import {
  approveAttemptAction,
  rejectAttemptAction,
} from "@/app/lecturer/sessions/actions";
import { PageHeader } from "@/components/page-header";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusBadge } from "@/components/status-badge";
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
      <Card className="glass-panel glass-panel-hover overflow-hidden relative border-border/40">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
        <CardHeader className="border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01] pb-4">
          <CardTitle className="text-base font-bold text-foreground">Pending review queue</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Attempts appear here when QR, enrolment, duplicate, or repeated
            submission safeguards require lecturer judgement.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 px-0">
          <Table>
            <TableHeader className="bg-slate-950/[0.02] dark:bg-white/[0.01]">
              <TableRow className="hover:bg-transparent border-b border-border/30">
                <TableHead className="px-6 py-3 font-semibold text-muted-foreground text-xs">Student</TableHead>
                <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Course / session</TableHead>
                <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Flag</TableHead>
                <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Method</TableHead>
                <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Attempted</TableHead>
                <TableHead className="px-6 py-3 text-right font-semibold text-muted-foreground text-xs">Decision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingAttempts.map((attempt) => (
                <TableRow key={attempt.id} className="hover:bg-muted/30 border-b border-border/20 transition-colors">
                  <TableCell className="px-6 py-4.5">
                    <p className="font-extrabold text-foreground text-sm">
                      {attempt.name ?? "Unknown student"}
                    </p>
                    <p className="text-[0.68rem] font-semibold text-muted-foreground mt-0.5">
                      {attempt.studentIdNumber ?? "No student ID"}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-4.5">
                    <p className="font-extrabold text-foreground text-sm">
                      {attempt.courseCode}: {attempt.courseTitle}
                    </p>
                    <Link
                      className="text-xs font-semibold text-primary underline-offset-4 hover:underline mt-0.5 block"
                      href={`/lecturer/courses/${attempt.courseId}/sessions/${attempt.sessionId}/reviews`}
                    >
                      {attempt.sessionTitle}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-4.5">
                    <StatusBadge status={attempt.reason ?? attempt.result} />
                  </TableCell>
                  <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">QR scan</TableCell>
                  <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">{attempt.attemptedAt.toLocaleString()}</TableCell>
                  <TableCell className="px-6 py-4.5 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <form action={approveAttemptAction}>
                        <input name="attemptId" type="hidden" value={attempt.id} />
                        <PendingSubmitButton pendingLabel="Approving..." size="sm" className="h-8.5 rounded-lg text-xs font-bold shadow-sm">
                          Approve
                        </PendingSubmitButton>
                      </form>
                      <form action={rejectAttemptAction}>
                        <input name="attemptId" type="hidden" value={attempt.id} />
                        <PendingSubmitButton
                          pendingLabel="Rejecting..."
                          size="sm"
                          variant="outline"
                          className="h-8.5 rounded-lg text-xs font-bold shadow-sm"
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
                    className="h-28 text-center text-muted-foreground text-xs font-semibold"
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
