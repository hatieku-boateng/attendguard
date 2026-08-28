import Link from "next/link";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { ArrowRight, CheckCircle2, QrCode, ScanLine } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default async function StudentDashboardPage() {
  const user = await requireRole("student");
  const studentId = user.studentProfileId ?? "";
  const db = getDb();
  const activeEnrolments = await db
    .select({ courseId: enrolments.courseId })
    .from(enrolments)
    .where(and(eq(enrolments.studentId, studentId), eq(enrolments.status, "active")));
  const courseIds = activeEnrolments.map((item) => item.courseId);

  const [[attendanceCount], activeSessions, recentAttendance] = await Promise.all([
    db.select({ value: count() }).from(attendanceRecords).where(eq(attendanceRecords.studentId, studentId)),
    courseIds.length
      ? db
          .select({
            id: attendanceSessions.id,
            title: attendanceSessions.sessionTitle,
            courseCode: courses.courseCode,
            finalClosesAt: attendanceSessions.finalClosesAt,
          })
          .from(attendanceSessions)
          .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
          .where(
            and(
              inArray(attendanceSessions.courseId, courseIds),
              eq(attendanceSessions.status, "open"),
            ),
          )
          .limit(5)
      : Promise.resolve([]),
    db
      .select({
        id: attendanceRecords.id,
        checkInAt: attendanceRecords.checkInAt,
        status: attendanceRecords.status,
        sessionTitle: attendanceSessions.sessionTitle,
        courseCode: courses.courseCode,
      })
      .from(attendanceRecords)
      .innerJoin(attendanceSessions, eq(attendanceRecords.sessionId, attendanceSessions.id))
      .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
      .where(eq(attendanceRecords.studentId, studentId))
      .orderBy(desc(attendanceRecords.checkInAt))
      .limit(5),
  ]);

  return (
    <>
      <PageHeader
        actions={
          <Button asChild className="gap-2">
            <Link href="/student/scan">
              <ScanLine className="size-4" />
              Scan QR
            </Link>
          </Button>
        }
        description="Scan live attendance codes and review your verified class history."
        title="Student dashboard"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Registered classes" tone="info" value={courseIds.length} />
        <StatCard label="Active sessions" tone="success" value={activeSessions.length} />
        <StatCard label="Attendance records" value={attendanceCount.value} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="flex min-h-72 flex-col justify-between border border-primary/20 bg-primary/5 p-6 sm:p-8">
          <div>
            <span className="flex size-12 items-center justify-center border border-primary/20 bg-background text-primary">
              <QrCode className="size-6" />
            </span>
            <h2 className="mt-6 text-xl font-extrabold text-foreground">Ready to check in?</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Open the scanner and point your camera at the rotating QR code displayed by your lecturer.
            </p>
          </div>
          <Button asChild className="mt-8 w-full gap-2 sm:w-fit">
            <Link href="/student/scan">
              <ScanLine className="size-4" />
              Open scanner
            </Link>
          </Button>
        </section>

        <Card className="overflow-hidden border-border/50">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Active sessions</CardTitle>
              <CardDescription>Open attendance windows in your registered classes.</CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost"><Link href="/student/sessions">View all <ArrowRight className="size-3.5" /></Link></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeSessions.map((session) => (
              <div className="flex items-center justify-between gap-4 border-b border-border/50 py-3 last:border-0" key={session.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{session.title}</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">{session.courseCode} / closes {session.finalClosesAt.toLocaleTimeString()}</p>
                </div>
                <StatusBadge status="open" />
              </div>
            ))}
            {activeSessions.length === 0 ? (
              <div className="grid min-h-36 place-items-center text-center text-sm font-semibold text-muted-foreground">No attendance sessions are open.</div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="size-4 text-primary" />Recent attendance</CardTitle>
          <CardDescription>Your latest recorded attendance results.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader><TableRow><TableHead className="px-6">Course</TableHead><TableHead>Session</TableHead><TableHead>Recorded</TableHead><TableHead className="px-6 text-right">Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {recentAttendance.map((record) => (
                <TableRow key={record.id}><TableCell className="px-6 font-bold">{record.courseCode}</TableCell><TableCell>{record.sessionTitle}</TableCell><TableCell>{record.checkInAt.toLocaleString()}</TableCell><TableCell className="px-6 text-right"><StatusBadge status={record.status} /></TableCell></TableRow>
              ))}
              {recentAttendance.length === 0 ? <TableRow><TableCell className="h-24 text-center text-muted-foreground" colSpan={4}>No attendance has been recorded yet.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
