import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
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
import {
  attendancePasskeys,
  attendanceRecords,
  attendanceSessions,
  courses,
  enrolments,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { decryptPasskey } from "@/lib/passkeys";

export default async function StudentSessionsPage() {
  const user = await requireRole("student");
  const db = getDb();
  const studentId = user.studentProfileId ?? "";

  const activeEnrolments = await db
    .select({ courseId: enrolments.courseId })
    .from(enrolments)
    .where(and(eq(enrolments.studentId, studentId), eq(enrolments.status, "active")));
  const courseIds = activeEnrolments.map((enrolment) => enrolment.courseId);

  const rows = courseIds.length
    ? await db
        .select({
          id: attendanceSessions.id,
          title: attendanceSessions.sessionTitle,
          opensAt: attendanceSessions.opensAt,
          normalClosesAt: attendanceSessions.normalClosesAt,
          finalClosesAt: attendanceSessions.finalClosesAt,
          status: attendanceSessions.status,
          courseCode: courses.courseCode,
          courseTitle: courses.courseTitle,
          passkeyCiphertext: attendancePasskeys.passkeyCiphertext,
          recordId: attendanceRecords.id,
        })
        .from(attendanceSessions)
        .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
        .leftJoin(
          attendancePasskeys,
          and(
            eq(attendancePasskeys.sessionId, attendanceSessions.id),
            eq(attendancePasskeys.studentId, studentId),
          ),
        )
        .leftJoin(
          attendanceRecords,
          and(
            eq(attendanceRecords.sessionId, attendanceSessions.id),
            eq(attendanceRecords.studentId, studentId),
          ),
        )
        .where(
          and(
            inArray(attendanceSessions.courseId, courseIds),
            eq(attendanceSessions.status, "open"),
          ),
        )
    : [];

  return (
    <>
      <PageHeader
        title="Active sessions"
        description="Open attendance sessions for your registered classes."
      />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Final close</TableHead>
                <TableHead>Passkey</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((session) => {
                const passkey = decryptPasskey(session.passkeyCiphertext);

                return (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.title}</TableCell>
                    <TableCell>
                      {session.courseCode}: {session.courseTitle}
                    </TableCell>
                    <TableCell>{session.finalClosesAt.toLocaleString()}</TableCell>
                    <TableCell className="font-mono">{passkey ?? "Not issued"}</TableCell>
                    <TableCell>
                      <StatusBadge status={session.recordId ? "present" : session.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" disabled={!passkey || Boolean(session.recordId)}>
                        <Link href={`/student/check-in/${session.id}`}>Check in</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={6}>
                    No active sessions are available right now.
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
