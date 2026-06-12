import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { Pencil } from "lucide-react";

import {
  approveAttemptAction,
  closeAttendanceSessionAction,
  generatePasskeysAction,
  rejectAttemptAction,
} from "@/app/lecturer/sessions/actions";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
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
  attendancePasskeys,
  attendanceRecords,
  attendanceSessions,
  courses,
  enrolments,
  studentProfiles,
  users,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function LecturerSessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ passkeys?: string }>;
}) {
  const { sessionId } = await params;
  const query = await searchParams;
  const user = await requireRole("lecturer");
  const db = getDb();

  const [session] = await db
    .select({
      id: attendanceSessions.id,
      title: attendanceSessions.sessionTitle,
      status: attendanceSessions.status,
      opensAt: attendanceSessions.opensAt,
      normalClosesAt: attendanceSessions.normalClosesAt,
      finalClosesAt: attendanceSessions.finalClosesAt,
      radius: attendanceSessions.geofenceRadiusMeters,
      maxAccuracy: attendanceSessions.maxAcceptedAccuracyMeters,
      courseId: attendanceSessions.courseId,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
    })
    .from(attendanceSessions)
    .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
    .where(
      and(
        eq(attendanceSessions.id, sessionId),
        eq(attendanceSessions.lecturerId, user.lecturerProfileId ?? ""),
      ),
    )
    .limit(1);

  if (!session) {
    return <PageHeader title="Session not found" />;
  }

  const [enrolledCount] = await db
    .select({ value: count() })
    .from(enrolments)
    .where(eq(enrolments.courseId, session.courseId));

  const [passkeyCount] = await db
    .select({ value: count() })
    .from(attendancePasskeys)
    .where(eq(attendancePasskeys.sessionId, session.id));

  const [presentCount] = await db
    .select({ value: count() })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.sessionId, session.id));

  const [reviewCount] = await db
    .select({ value: count() })
    .from(attendanceAttempts)
    .where(
      and(
        eq(attendanceAttempts.sessionId, session.id),
        eq(attendanceAttempts.reviewStatus, "pending"),
      ),
    );

  const records = await db
    .select({
      id: attendanceRecords.id,
      name: users.name,
      studentIdNumber: studentProfiles.studentIdNumber,
      status: attendanceRecords.status,
      checkInAt: attendanceRecords.checkInAt,
      distance: attendanceRecords.calculatedDistanceMeters,
      accuracy: attendanceRecords.locationAccuracyMeters,
    })
    .from(attendanceRecords)
    .innerJoin(studentProfiles, eq(attendanceRecords.studentId, studentProfiles.id))
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(eq(attendanceRecords.sessionId, session.id));

  const attempts = await db
    .select({
      id: attendanceAttempts.id,
      name: users.name,
      studentIdNumber: studentProfiles.studentIdNumber,
      result: attendanceAttempts.result,
      rejectionReason: attendanceAttempts.rejectionReason,
      reviewStatus: attendanceAttempts.reviewStatus,
      attemptedAt: attendanceAttempts.attemptedAt,
      distance: attendanceAttempts.calculatedDistanceMeters,
      accuracy: attendanceAttempts.locationAccuracyMeters,
    })
    .from(attendanceAttempts)
    .leftJoin(studentProfiles, eq(attendanceAttempts.studentId, studentProfiles.id))
    .leftJoin(users, eq(studentProfiles.userId, users.id))
    .where(eq(attendanceAttempts.sessionId, session.id));

  return (
    <>
      <PageHeader
        title={session.title}
        description={`${session.courseCode}: ${session.courseTitle}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/lecturer/sessions/${session.id}/edit`}>
                <Pencil className="size-4" />
                Edit session
              </Link>
            </Button>
            <form action={generatePasskeysAction}>
              <input name="sessionId" type="hidden" value={session.id} />
              <Button type="submit" variant="outline">
                Generate passkeys
              </Button>
            </form>
            <form action={closeAttendanceSessionAction}>
              <input name="sessionId" type="hidden" value={session.id} />
              <Button type="submit">Close session</Button>
            </form>
          </>
        }
      />
      {query.passkeys ? (
        <p className="mb-6 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
          Generated passkeys for {query.passkeys} enrolled student(s).
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Enrolled" value={enrolledCount.value} tone="info" />
        <StatCard label="Passkeys" value={passkeyCount.value} />
        <StatCard label="Recorded" value={presentCount.value} tone="success" />
        <StatCard label="Awaiting review" value={reviewCount.value} tone="warning" />
        <StatCard label="Status" value={session.status} />
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Session rules</CardTitle>
          <CardDescription>
            Opens {session.opensAt.toLocaleString()}, normal close{" "}
            {session.normalClosesAt.toLocaleString()}, final close{" "}
            {session.finalClosesAt.toLocaleString()}.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Radius: {session.radius}m. Max accepted accuracy: {session.maxAccuracy}m.
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Accepted attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Accuracy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {record.name} ({record.studentIdNumber})
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{record.status}</Badge>
                  </TableCell>
                  <TableCell>{record.checkInAt.toLocaleString()}</TableCell>
                  <TableCell>{record.distance ?? "-"}m</TableCell>
                  <TableCell>{record.accuracy ?? "-"}m</TableCell>
                </TableRow>
              ))}
              {records.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={5}>
                    No accepted attendance yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Attempts and review queue</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Attempted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell>
                    {attempt.name
                      ? `${attempt.name} (${attempt.studentIdNumber})`
                      : "Unknown student"}
                  </TableCell>
                  <TableCell>{attempt.result}</TableCell>
                  <TableCell>{attempt.rejectionReason ?? "-"}</TableCell>
                  <TableCell>
                    {attempt.reviewStatus === "pending" ? (
                      <div className="flex flex-wrap gap-2">
                        <form action={approveAttemptAction}>
                          <input name="attemptId" type="hidden" value={attempt.id} />
                          <Button size="sm" type="submit" variant="outline">
                            Approve
                          </Button>
                        </form>
                        <form action={rejectAttemptAction}>
                          <input name="attemptId" type="hidden" value={attempt.id} />
                          <Button size="sm" type="submit" variant="outline">
                            Reject
                          </Button>
                        </form>
                      </div>
                    ) : (
                      attempt.reviewStatus
                    )}
                  </TableCell>
                  <TableCell>{attempt.attemptedAt.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {attempts.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={5}>
                    No attempts have been submitted yet.
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
