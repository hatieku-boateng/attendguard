import { eq } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
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
import { attendanceRecords, attendanceSessions, courses } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function AttendanceHistoryPage() {
  const user = await requireRole("student");
  const db = getDb();

  const rows = await db
    .select({
      id: attendanceRecords.id,
      status: attendanceRecords.status,
      checkInAt: attendanceRecords.checkInAt,
      distance: attendanceRecords.calculatedDistanceMeters,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
      sessionTitle: attendanceSessions.sessionTitle,
    })
    .from(attendanceRecords)
    .innerJoin(attendanceSessions, eq(attendanceRecords.sessionId, attendanceSessions.id))
    .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
    .where(eq(attendanceRecords.studentId, user.studentProfileId ?? ""));

  return (
    <>
      <PageHeader
        title="Attendance history"
        description="Attendance records linked to your student account, including absences recorded when sessions close."
      />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Distance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {record.courseCode}: {record.courseTitle}
                  </TableCell>
                  <TableCell>{record.sessionTitle}</TableCell>
                  <TableCell>
                    <StatusBadge status={record.status} />
                  </TableCell>
                  <TableCell>{record.checkInAt.toLocaleString()}</TableCell>
                  <TableCell>{record.distance ?? "-"}m</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={5}>
                    No attendance records yet.
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
