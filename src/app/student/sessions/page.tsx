import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { Clock, ScanLine } from "lucide-react";

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
import { attendanceRecords, attendanceSessions, courses, enrolments } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function StudentSessionsPage() {
  const user = await requireRole("student");
  const studentId = user.studentProfileId ?? "";
  const db = getDb();
  const activeEnrolments = await db
    .select({ courseId: enrolments.courseId })
    .from(enrolments)
    .where(and(eq(enrolments.studentId, studentId), eq(enrolments.status, "active")));
  const courseIds = activeEnrolments.map((item) => item.courseId);
  const rows = courseIds.length
    ? await db
        .select({
          id: attendanceSessions.id,
          title: attendanceSessions.sessionTitle,
          normalClosesAt: attendanceSessions.normalClosesAt,
          finalClosesAt: attendanceSessions.finalClosesAt,
          status: attendanceSessions.status,
          courseCode: courses.courseCode,
          courseTitle: courses.courseTitle,
          recordStatus: attendanceRecords.status,
        })
        .from(attendanceSessions)
        .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
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
        actions={<Button asChild><Link href="/student/scan"><ScanLine className="size-4" />Scan QR</Link></Button>}
        description="View open attendance windows, then scan the code shown by your lecturer."
        title="Active sessions"
      />
      <Card className="overflow-hidden border-border/50">
        <CardContent className="px-0 pt-0">
          <Table>
            <TableHeader><TableRow><TableHead className="px-6">Session</TableHead><TableHead>Course</TableHead><TableHead>Present until</TableHead><TableHead>Final close</TableHead><TableHead className="px-6 text-right">Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((session) => (
                <TableRow key={session.id}><TableCell className="px-6 font-bold">{session.title}</TableCell><TableCell><span className="font-bold">{session.courseCode}</span><span className="block text-xs text-muted-foreground">{session.courseTitle}</span></TableCell><TableCell>{session.normalClosesAt.toLocaleString()}</TableCell><TableCell>{session.finalClosesAt.toLocaleString()}</TableCell><TableCell className="px-6 text-right"><StatusBadge status={session.recordStatus ?? session.status} /></TableCell></TableRow>
              ))}
              {rows.length === 0 ? <TableRow><TableCell className="h-40 text-center text-muted-foreground" colSpan={5}><Clock className="mx-auto mb-3 size-6 opacity-35" />No attendance sessions are open.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
