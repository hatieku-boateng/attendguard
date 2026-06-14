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
        title="Student Dashboard"
        description="Monitor your enrolled courses, perform real-time class check-ins, and review your historical logs."
      />
      
      {/* Quick stats grid */}
      <div className="grid gap-5 sm:grid-cols-3 mb-8">
        <StatCard label="Registered classes" value={classCount.value} tone="info" />
        <StatCard label="Active sessions" value={activeSessionCount.value} tone="success" />
        <StatCard label="Recorded attendance" value={attendanceCount.value} />
      </div>

      {/* Main dashboard widgets grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Active sessions widget */}
        <Card className="lg:col-span-7 overflow-hidden relative glass-panel glass-panel-hover border-border/40">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01]">
            <div>
              <CardTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
                <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/15">
                  <Clock className="size-4 animate-pulse" />
                </span>
                Active Sessions
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Attendance sessions currently open for your courses.
              </CardDescription>
            </div>
            {activeSessionCount.value > 5 && (
              <Button asChild size="sm" variant="ghost" className="text-xs font-semibold text-primary hover:text-primary/80">
                <Link href="/student/sessions" className="flex items-center gap-1">
                  View all <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-4 px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-950/[0.02] dark:bg-white/[0.01]">
                  <TableRow className="hover:bg-transparent border-b border-border/30">
                    <TableHead className="px-6 py-3 font-semibold text-muted-foreground text-xs">Session</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Passkey</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Status</TableHead>
                    <TableHead className="px-6 py-3 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSessionsList.map((session) => {
                    const passkey = decryptPasskey(session.passkeyCiphertext);
                    const isRecorded = Boolean(session.recordId);

                    return (
                      <TableRow key={session.id} className="hover:bg-muted/30 border-b border-border/20 transition-colors">
                        <TableCell className="px-6 py-4.5">
                          <p className="text-sm font-extrabold text-foreground">{session.title}</p>
                          <p className="text-[0.68rem] text-muted-foreground font-semibold mt-1 uppercase tracking-wider">{session.courseCode}</p>
                        </TableCell>
                        <TableCell className="px-4 py-4.5">
                          {passkey ? (
                            <code className="px-2 py-1 rounded bg-muted font-mono text-xs text-foreground font-bold border border-border/40">
                              {passkey}
                            </code>
                          ) : (
                            <span className="text-xs text-muted-foreground/50 font-medium">Pending</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-4.5">
                          <StatusBadge status={isRecorded ? "present" : session.status} />
                        </TableCell>
                        <TableCell className="px-6 py-4.5 text-right">
                          <Button asChild size="sm" disabled={!passkey || isRecorded} className="h-9 rounded-xl text-xs font-bold shadow-sm">
                            <Link href={`/student/check-in/${session.id}`}>Check in</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {activeSessionsList.length === 0 && (
                    <TableRow>
                      <TableCell className="h-44 text-center text-muted-foreground text-xs" colSpan={4}>
                        <div className="flex flex-col items-center justify-center gap-3 py-6">
                          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground/35">
                            <Calendar className="size-6" />
                          </span>
                          <p className="font-semibold text-muted-foreground/60 text-sm">No open sessions right now.</p>
                          <p className="text-[0.68rem] text-muted-foreground/40 max-w-xs leading-relaxed">When a lecturer broadcasts a geofence passkey, it will appear here instantly.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent history widget */}
        <Card className="lg:col-span-5 overflow-hidden relative glass-panel glass-panel-hover border-border/40">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01]">
            <div>
              <CardTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/15">
                  <CheckCircle className="size-4" />
                </span>
                Recent Check-ins
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Your latest recorded attendance verifications.
              </CardDescription>
            </div>
            {attendanceCount.value > 5 && (
              <Button asChild size="sm" variant="ghost" className="text-xs font-semibold text-primary hover:text-primary/80">
                <Link href="/student/attendance-history" className="flex items-center gap-1">
                  History <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-4 px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-950/[0.02] dark:bg-white/[0.01]">
                  <TableRow className="hover:bg-transparent border-b border-border/30">
                    <TableHead className="px-6 py-3 font-semibold text-muted-foreground text-xs">Course</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Date</TableHead>
                    <TableHead className="px-6 py-3 text-right font-semibold text-muted-foreground text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAttendance.map((record) => (
                    <TableRow key={record.id} className="hover:bg-muted/30 border-b border-border/20 transition-colors">
                      <TableCell className="px-6 py-4">
                        <p className="text-xs font-extrabold text-foreground">{record.courseCode}</p>
                        <p className="text-[0.68rem] text-muted-foreground truncate max-w-[150px] font-semibold mt-1">
                          {record.sessionTitle}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-[0.75rem] text-muted-foreground font-semibold">
                        {record.checkInAt.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <StatusBadge status={record.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentAttendance.length === 0 && (
                    <TableRow>
                      <TableCell className="h-44 text-center text-muted-foreground text-xs" colSpan={3}>
                        <div className="flex flex-col items-center justify-center gap-3 py-6">
                          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground/35">
                            <Shield className="size-6" />
                          </span>
                          <p className="font-semibold text-muted-foreground/60 text-sm">No logs recorded yet.</p>
                          <p className="text-[0.68rem] text-muted-foreground/40 max-w-xs leading-relaxed">Your coordinate check-ins will build an auditable timeline here.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
