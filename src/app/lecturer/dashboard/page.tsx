import { and, count, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import { Clock } from "lucide-react";
import {
  attendanceAttempts,
  attendanceRecords,
  attendanceSessions,
  courses,
  enrolments,
  studentProfiles,
  users,
} from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth";

const attendedStatuses = new Set(["present", "late", "manually_present"]);

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function AnalyticsBar({
  label,
  value,
  total,
  tone = "default",
}: {
  label: string;
  value: number;
  total: number;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const width = percent(value, total);
  const gradientClass =
    tone === "success"
      ? "bg-[linear-gradient(90deg,oklch(0.64_0.16_145),oklch(0.50_0.15_180))] shadow-[0_0_8px_rgba(16,185,129,0.2)]"
      : tone === "warning"
        ? "bg-[linear-gradient(90deg,oklch(0.78_0.14_85),oklch(0.62_0.12_65))] shadow-[0_0_8px_rgba(245,158,11,0.2)]"
        : tone === "danger"
          ? "bg-[linear-gradient(90deg,oklch(0.60_0.15_25),oklch(0.50_0.17_20))] shadow-[0_0_8px_rgba(239,68,68,0.2)]"
          : "bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))] shadow-[0_0_8px_rgba(6,182,212,0.2)]";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
        <span className="font-semibold text-foreground/90 capitalize">{label}</span>
        <span className="font-mono text-xs text-muted-foreground bg-muted/50 dark:bg-zinc-800/40 px-2 py-0.5 rounded-md border border-border/40">
          {value} <span className="text-muted-foreground/50 mx-0.5">/</span> {width}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted/70 dark:bg-zinc-800/60 border border-border/10">
        <div className={`h-full rounded-full transition-all duration-500 ease-out ${gradientClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default async function LecturerDashboardPage() {
  const user = await requireRole("lecturer");
  const db = getDb();

  const lecturerId = user.lecturerProfileId ?? "";
  const lecturerCourses = await db
    .select({
      id: courses.id,
      code: courses.courseCode,
      title: courses.courseTitle,
    })
    .from(courses)
    .where(eq(courses.lecturerId, lecturerId));
  const courseIds = lecturerCourses.map((course) => course.id);

  const [studentCount] = courseIds.length
    ? await db
        .select({ value: count() })
        .from(enrolments)
        .where(
          and(
            inArray(enrolments.courseId, courseIds),
            eq(enrolments.status, "active"),
          ),
        )
    : [{ value: 0 }];

  const [openSessionCount] = await db
    .select({ value: count() })
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.lecturerId, lecturerId),
        eq(attendanceSessions.status, "open"),
      ),
    );

  const [reviewCount] = await db
    .select({ value: count() })
    .from(attendanceAttempts)
    .innerJoin(
      attendanceSessions,
      eq(attendanceAttempts.sessionId, attendanceSessions.id),
    )
    .where(
      and(
        eq(attendanceSessions.lecturerId, lecturerId),
        eq(attendanceAttempts.reviewStatus, "pending"),
      ),
    );

  const [recordCount] = await db
    .select({ value: count() })
    .from(attendanceRecords)
    .innerJoin(
      attendanceSessions,
      eq(attendanceRecords.sessionId, attendanceSessions.id),
    )
    .where(eq(attendanceSessions.lecturerId, lecturerId));

  const attendanceRows = await db
    .select({
      courseId: courses.id,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
      sessionId: attendanceSessions.id,
      sessionTitle: attendanceSessions.sessionTitle,
      sessionDate: attendanceSessions.sessionDate,
      sessionStatus: attendanceSessions.status,
      studentId: studentProfiles.id,
      studentName: users.name,
      status: attendanceRecords.status,
    })
    .from(attendanceRecords)
    .innerJoin(attendanceSessions, eq(attendanceRecords.sessionId, attendanceSessions.id))
    .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
    .innerJoin(studentProfiles, eq(attendanceRecords.studentId, studentProfiles.id))
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(eq(attendanceSessions.lecturerId, lecturerId))
    .orderBy(desc(attendanceSessions.sessionDate))
    .limit(1200);

  const statusCounts = attendanceRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});
  const attendedCount = attendanceRows.filter((row) =>
    attendedStatuses.has(row.status),
  ).length;
  const absenceCount = statusCounts.absent ?? 0;
  const attendanceRate = percent(attendedCount, attendedCount + absenceCount);

  const coursePerformance = lecturerCourses
    .map((course) => {
      const rows = attendanceRows.filter((row) => row.courseId === course.id);
      const attended = rows.filter((row) => attendedStatuses.has(row.status)).length;
      const absent = rows.filter((row) => row.status === "absent").length;

      return {
        ...course,
        total: rows.length,
        attended,
        absent,
        rate: percent(attended, attended + absent),
      };
    })
    .filter((course) => course.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const recentSessionMap = new Map<
    string,
    {
      id: string;
      title: string;
      courseCode: string;
      date: Date;
      present: number;
      late: number;
      absent: number;
      total: number;
    }
  >();

  for (const row of attendanceRows) {
    const session =
      recentSessionMap.get(row.sessionId) ??
      {
        id: row.sessionId,
        title: row.sessionTitle,
        courseCode: row.courseCode,
        date: row.sessionDate,
        present: 0,
        late: 0,
        absent: 0,
        total: 0,
      };

    if (row.status === "absent") {
      session.absent += 1;
    } else if (row.status === "late") {
      session.late += 1;
    } else if (attendedStatuses.has(row.status)) {
      session.present += 1;
    }

    session.total += 1;
    recentSessionMap.set(row.sessionId, session);
  }

  const recentSessions = Array.from(recentSessionMap.values())
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  const streakMap = new Map<
    string,
    {
      courseCode: string;
      studentName: string;
      streak: number;
      active: boolean;
    }
  >();

  for (const row of attendanceRows) {
    if (row.sessionStatus !== "closed") {
      continue;
    }

    const key = `${row.courseId}:${row.studentId}`;
    const current =
      streakMap.get(key) ??
      {
        courseCode: row.courseCode,
        studentName: row.studentName,
        streak: 0,
        active: true,
      };

    if (!current.active) {
      continue;
    }

    if (row.status === "absent") {
      current.streak += 1;
    } else {
      current.active = false;
    }

    streakMap.set(key, current);
  }

  const atRiskStudents = Array.from(streakMap.entries())
    .map(([key, student]) => ({ ...student, key }))
    .filter((student) => student.streak >= 2)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title="Lecturer Dashboard"
        description="Monitor your assigned courses, audit live student enrolment metrics, check geofenced session states, and review checks."
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Courses" value={lecturerCourses.length} tone="info" />
        <StatCard label="Enrolled students" value={studentCount.value} />
        <StatCard label="Open sessions" value={openSessionCount.value} tone="success" />
        <StatCard label="Attendance records" value={recordCount.value} />
        <StatCard label="Awaiting review" value={reviewCount.value} tone="warning" />
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="glass-panel glass-panel-hover border-border/40 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
          <CardHeader className="border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01] pb-4">
            <CardTitle className="text-base font-bold text-foreground">Attendance Health</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Recorded attendance distribution across all courses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-5 sm:grid-cols-3 bg-muted/20 border border-border/30 rounded-2xl p-4.5">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attendance Rate</p>
                <p className="font-mono text-3xl font-extrabold text-foreground mt-1.5">{attendanceRate}%</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Present or Late</p>
                <p className="font-mono text-3xl font-extrabold text-foreground mt-1.5">{attendedCount}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Absent</p>
                <p className="font-mono text-3xl font-extrabold text-foreground mt-1.5">{absenceCount}</p>
              </div>
            </div>
            <div className="space-y-4 pt-2">
              {["present", "late", "manually_present", "excused", "absent"].map((status) => (
                <AnalyticsBar
                  key={status}
                  label={statusLabel(status)}
                  tone={status === "absent" ? "danger" : status === "late" ? "warning" : "success"}
                  total={attendanceRows.length}
                  value={statusCounts[status] ?? 0}
                />
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-panel glass-panel-hover border-border/40 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />
          <CardHeader className="border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01] pb-4">
            <CardTitle className="text-base font-bold text-foreground">Students at Risk</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Students currently on two or more consecutive absences.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-950/[0.01] dark:bg-white/[0.01]">
                  <TableRow className="hover:bg-transparent border-b border-border/30">
                    <TableHead className="px-6 py-3 font-semibold text-muted-foreground text-xs">Student</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Course</TableHead>
                    <TableHead className="px-6 py-3 text-right font-semibold text-muted-foreground text-xs">Streak</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atRiskStudents.map((student) => (
                    <TableRow key={student.key} className="hover:bg-muted/20 border-b border-border/20 transition-colors">
                      <TableCell className="px-6 py-4.5 font-bold text-foreground text-sm">{student.studentName}</TableCell>
                      <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">{student.courseCode}</TableCell>
                      <TableCell className="px-6 py-4.5 text-right">
                        <Badge className="font-extrabold" variant={student.streak >= 3 ? "destructive" : "secondary"}>
                          {student.streak} Absences
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {atRiskStudents.length === 0 && (
                    <TableRow>
                      <TableCell className="h-44 text-center text-muted-foreground text-xs" colSpan={3}>
                        <div className="flex flex-col items-center justify-center gap-3 py-6">
                          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/15">
                            ✔
                          </span>
                          <p className="font-semibold text-muted-foreground/60 text-sm">No at-risk student accounts flagged.</p>
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
      
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card className="glass-panel glass-panel-hover border-border/40 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
          <CardHeader className="border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01] pb-4">
            <CardTitle className="text-base font-bold text-foreground">Course Comparison</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Attendance rate per course using present, late, and manual check-ins.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            {coursePerformance.map((course) => (
              <AnalyticsBar
                key={course.id}
                label={`${course.code} - ${course.rate}%`}
                tone={course.rate >= 80 ? "success" : course.rate >= 60 ? "warning" : "danger"}
                total={course.attended + course.absent}
                value={course.attended}
              />
            ))}
            {coursePerformance.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
                Course comparison will populate once attendance records are verified.
              </div>
            ) : null}
          </CardContent>
        </Card>
        
        <Card className="glass-panel glass-panel-hover border-border/40 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 to-indigo-500" />
          <CardHeader className="border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01] pb-4">
            <CardTitle className="text-base font-bold text-foreground">Recent Session Outcomes</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Quick review of student attendance from your latest active sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-950/[0.01] dark:bg-white/[0.01]">
                  <TableRow className="hover:bg-transparent border-b border-border/30">
                    <TableHead className="px-6 py-3 font-semibold text-muted-foreground text-xs">Session</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Course</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs text-emerald-600 dark:text-emerald-400">Present</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs text-amber-600 dark:text-amber-400">Late</TableHead>
                    <TableHead className="px-6 py-3 text-right font-semibold text-muted-foreground text-xs text-rose-600 dark:text-rose-450">Absent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSessions.map((session) => (
                    <TableRow key={session.id} className="hover:bg-muted/20 border-b border-border/20 transition-colors">
                      <TableCell className="px-6 py-4 font-bold text-foreground text-sm">{session.title}</TableCell>
                      <TableCell className="px-4 py-4 text-xs font-bold text-muted-foreground">{session.courseCode}</TableCell>
                      <TableCell className="px-4 py-4 text-xs font-bold text-emerald-600 dark:text-emerald-400">{session.present}</TableCell>
                      <TableCell className="px-4 py-4 text-xs font-bold text-amber-600 dark:text-amber-400">{session.late}</TableCell>
                      <TableCell className="px-6 py-4 text-right text-xs font-bold text-rose-650 dark:text-rose-450">{session.absent}</TableCell>
                    </TableRow>
                  ))}
                  {recentSessions.length === 0 && (
                    <TableRow>
                      <TableCell className="h-44 text-center text-muted-foreground text-xs" colSpan={5}>
                        <div className="flex flex-col items-center justify-center gap-3 py-6">
                          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground/35 animate-pulse">
                            <Clock className="size-6" />
                          </span>
                          <p className="font-semibold text-muted-foreground/60 text-sm">No recent sessions found.</p>
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
