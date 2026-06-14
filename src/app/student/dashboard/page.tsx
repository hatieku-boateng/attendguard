import Link from "next/link";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { ArrowRight, Calendar, CheckCircle, Clock, Shield } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export default async function StudentDashboardPage() {
  const user = await requireRole("student");
  const db = getDb();
  const studentId = user.studentProfileId ?? "";

  // 1. Get student enrolments
  const studentEnrolments = await db
    .select({ courseId: enrolments.courseId })
    .from(enrolments)
    .where(
      and(eq(enrolments.studentId, studentId), eq(enrolments.status, "active")),
    );
  const courseIds = studentEnrolments.map((enrolment) => enrolment.courseId);

  // Stats queries
  const [classCount] = courseIds.length
    ? await db
        .select({ value: count() })
        .from(courses)
        .where(inArray(courses.id, courseIds))
    : [{ value: 0 }];

  const [activeSessionCount] = courseIds.length
    ? await db
        .select({ value: count() })
        .from(attendanceSessions)
        .where(
          and(
            inArray(attendanceSessions.courseId, courseIds),
            eq(attendanceSessions.status, "open"),
          ),
        )
    : [{ value: 0 }];

  const [attendanceCount] = await db
    .select({ value: count() })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.studentId, studentId));

  // 2. Query active sessions (limit 5)
  const activeSessionsList = courseIds.length
    ? await db
        .select({
          id: attendanceSessions.id,
          title: attendanceSessions.sessionTitle,
          opensAt: attendanceSessions.opensAt,
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
        .limit(5)
    : [];

  // 3. Query recent attendance records (limit 5)
  const recentAttendance = await db
    .select({
      id: attendanceRecords.id,
      checkInAt: attendanceRecords.checkInAt,
      status: attendanceRecords.status,
      sessionTitle: attendanceSessions.sessionTitle,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
    })
    .from(attendanceRecords)
    .innerJoin(attendanceSessions, eq(attendanceRecords.sessionId, attendanceSessions.id))
    .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
    .where(eq(attendanceRecords.studentId, studentId))
    .orderBy(desc(attendanceRecords.checkInAt))
    .limit(5);

  return (
    <>
      <PageHeader
        title="Student dashboard"
        description="Your registered classes, active attendance sessions, and recorded attendance history."
      />
      
      {/* Quick stats grid */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <StatCard label="Registered classes" value={classCount.value} tone="info" />
        <StatCard label="Active sessions" value={activeSessionCount.value} tone="success" />
        <StatCard label="Recorded attendance" value={attendanceCount.value} />
      </div>

      {/* Main dashboard widgets grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Active sessions widget */}
        <Card className="lg:col-span-7 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,oklch(0.64_0.16_145),oklch(0.50_0.15_180))]" />
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Clock className="size-4.5 text-emerald-500 animate-pulse" />
                Active Sessions
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Attendance sessions currently open for your classes.
              </CardDescription>
            </div>
            {activeSessionCount.value > 5 && (
              <Button asChild size="sm" variant="ghost" className="text-xs">
                <Link href="/student/sessions" className="flex items-center gap-1">
                  View all <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Passkey</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSessionsList.map((session) => {
                  const passkey = decryptPasskey(session.passkeyCiphertext);
                  const isRecorded = Boolean(session.recordId);

                  return (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium py-3.5">
                        <p className="text-sm font-bold text-foreground">{session.title}</p>
                        <p className="text-[0.68rem] text-muted-foreground font-medium mt-0.5">{session.courseCode}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-foreground/80 font-bold">{passkey ?? "Pending"}</TableCell>
                      <TableCell>
                        <StatusBadge status={isRecorded ? "present" : session.status} />
                      </TableCell>
                      <TableCell className="text-right py-3.5">
                        <Button asChild size="sm" disabled={!passkey || isRecorded} className="h-8.5 rounded-lg text-xs font-bold">
                          <Link href={`/student/check-in/${session.id}`}>Check in</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {activeSessionsList.length === 0 && (
                  <TableRow>
                    <TableCell className="h-32 text-center text-muted-foreground text-xs" colSpan={4}>
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Calendar className="size-7 opacity-30" />
                        <p className="font-medium">No open sessions right now.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent history widget */}
        <Card className="lg:col-span-5 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <CheckCircle className="size-4.5 text-primary" />
                Recent Check-ins
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Your latest recorded attendance checks.
              </CardDescription>
            </div>
            {attendanceCount.value > 5 && (
              <Button asChild size="sm" variant="ghost" className="text-xs">
                <Link href="/student/attendance-history" className="flex items-center gap-1">
                  History <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAttendance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="py-3.5">
                      <p className="text-xs font-bold text-foreground">{record.courseCode}</p>
                      <p className="text-[0.68rem] text-muted-foreground truncate max-w-[130px] font-medium mt-0.5">
                        {record.sessionTitle}
                      </p>
                    </TableCell>
                    <TableCell className="text-[0.7rem] text-muted-foreground font-medium py-3.5">
                      {record.checkInAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right py-3.5">
                      <StatusBadge status={record.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {recentAttendance.length === 0 && (
                  <TableRow>
                    <TableCell className="h-32 text-center text-muted-foreground text-xs" colSpan={3}>
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Shield className="size-7 opacity-30" />
                        <p className="font-medium">No check-ins recorded yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
