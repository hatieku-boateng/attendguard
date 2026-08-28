import { and, desc, eq, gte, inArray } from "drizzle-orm";
import {
  AlertTriangle,
  BarChart3,
  CalendarX,
  CheckCircle2,
  Clock3,
  History,
  Search,
  TrendingUp,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

type AttendanceStatus = "present" | "late" | "manually_present" | "excused" | "absent";

const creditedStatuses = new Set<AttendanceStatus>(["present", "late", "manually_present"]);

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function periodStart(period: string) {
  if (period === "all") return null;

  const days = period === "90" ? 90 : period === "30" ? 30 : period === "7" ? 7 : 30;
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

function courseRateClass(rate: number) {
  if (rate >= 80) return "bg-emerald-500";
  if (rate >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

export default async function AttendanceHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; status?: string; period?: string; q?: string }>;
}) {
  const user = await requireRole("student");
  const db = getDb();
  const studentId = user.studentProfileId ?? "";
  const params = await searchParams;
  const selectedCourse = params.course ?? "all";
  const selectedStatus = params.status ?? "all";
  const selectedPeriod = params.period ?? "30";
  const query = (params.q ?? "").trim().toLowerCase();
  const startDate = periodStart(selectedPeriod);

  const studentCourses = await db
    .select({
      id: courses.id,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
      semester: courses.semester,
      academicYear: courses.academicYear,
      classGroup: courses.classGroup,
    })
    .from(enrolments)
    .innerJoin(courses, eq(enrolments.courseId, courses.id))
    .where(and(eq(enrolments.studentId, studentId), eq(enrolments.status, "active")));

  const courseIds = studentCourses.map((course) => course.id);
  const filters = [eq(attendanceRecords.studentId, studentId)];

  if (courseIds.length > 0) {
    filters.push(inArray(attendanceSessions.courseId, courseIds));
  }

  if (selectedCourse !== "all") {
    filters.push(eq(courses.id, selectedCourse));
  }

  if (selectedStatus !== "all") {
    filters.push(eq(attendanceRecords.status, selectedStatus as AttendanceStatus));
  }

  if (startDate) {
    filters.push(gte(attendanceSessions.sessionDate, startDate));
  }

  const allRows = courseIds.length
    ? await db
        .select({
          id: attendanceRecords.id,
          status: attendanceRecords.status,
          checkInAt: attendanceRecords.checkInAt,
          verificationMethod: attendanceRecords.verificationMethod,
          remarks: attendanceRecords.lecturerRemarks,
          courseId: courses.id,
          courseCode: courses.courseCode,
          courseTitle: courses.courseTitle,
          semester: courses.semester,
          academicYear: courses.academicYear,
          sessionId: attendanceSessions.id,
          sessionTitle: attendanceSessions.sessionTitle,
          sessionDate: attendanceSessions.sessionDate,
          sessionStatus: attendanceSessions.status,
        })
        .from(attendanceRecords)
        .innerJoin(attendanceSessions, eq(attendanceRecords.sessionId, attendanceSessions.id))
        .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
        .where(and(...filters))
        .orderBy(desc(attendanceSessions.sessionDate))
    : [];

  const rows = query
    ? allRows.filter((record) =>
        [record.courseCode, record.courseTitle, record.sessionTitle]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : allRows;

  const totalRecords = rows.length;
  const presentCount = rows.filter((record) => record.status === "present").length;
  const lateCount = rows.filter((record) => record.status === "late").length;
  const manualCount = rows.filter((record) => record.status === "manually_present").length;
  const excusedCount = rows.filter((record) => record.status === "excused").length;
  const absentCount = rows.filter((record) => record.status === "absent").length;
  const creditedCount = rows.filter((record) => creditedStatuses.has(record.status)).length;
  const attendanceRate = percent(creditedCount, totalRecords);
  const missedRows = rows.filter((record) => record.status === "absent");

  const absenceStreak = rows.reduce((streak, record) => {
    if (streak.done) return streak;
    if (record.status === "absent") return { value: streak.value + 1, done: false };
    return { value: streak.value, done: true };
  }, { value: 0, done: false }).value;

  const courseSummaries = studentCourses.map((course) => {
    const courseRows = rows.filter((record) => record.courseId === course.id);
    const credited = courseRows.filter((record) => creditedStatuses.has(record.status)).length;
    const absent = courseRows.filter((record) => record.status === "absent").length;
    const late = courseRows.filter((record) => record.status === "late").length;
    const rate = percent(credited, courseRows.length);

    return {
      ...course,
      total: courseRows.length,
      credited,
      absent,
      late,
      rate,
    };
  });

  return (
    <>
      <PageHeader
        title="Attendance History"
        description="Track your class attendance, missed sessions, late check-ins, and course-by-course standing."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="glass-panel border-border/40">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/15">
                <TrendingUp className="size-5" />
              </span>
              <span className="text-3xl font-black text-foreground">{attendanceRate}%</span>
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Attendance rate</p>
            <p className="mt-1 text-sm text-muted-foreground">{creditedCount} credited out of {totalRecords} recorded sessions</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/40">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/15">
                <CheckCircle2 className="size-5" />
              </span>
              <span className="text-3xl font-black text-foreground">{presentCount + manualCount}</span>
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Present</p>
            <p className="mt-1 text-sm text-muted-foreground">{manualCount} manually approved attendance record(s)</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/40">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/15">
                <Clock3 className="size-5" />
              </span>
              <span className="text-3xl font-black text-foreground">{lateCount}</span>
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Late arrivals</p>
            <p className="mt-1 text-sm text-muted-foreground">{excusedCount} excused record(s) shown separately</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/40">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/15">
                <CalendarX className="size-5" />
              </span>
              <span className="text-3xl font-black text-foreground">{absentCount}</span>
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Missed classes</p>
            <p className="mt-1 text-sm text-muted-foreground">{absenceStreak} current consecutive absence(s)</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel border-border/40 mt-6">
        <CardContent className="p-5">
          <form className="grid gap-3 lg:grid-cols-[1fr_180px_160px_160px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Search course or session"
                className="pl-9 h-11"
              />
            </div>
            <select
              name="course"
              defaultValue={selectedCourse}
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground"
            >
              <option value="all">All courses</option>
              {studentCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.courseCode}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={selectedStatus}
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground"
            >
              <option value="all">All statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="manually_present">Manual</option>
              <option value="excused">Excused</option>
              <option value="absent">Absent</option>
            </select>
            <select
              name="period"
              defaultValue={selectedPeriod}
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            <Button type="submit" className="h-11 rounded-xl font-bold">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 mt-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="glass-panel glass-panel-hover overflow-hidden relative border-border/40">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
          <CardHeader className="border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01]">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <BarChart3 className="size-5 text-primary" />
              Course Standing
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/20">
              {courseSummaries.map((course) => (
                <div key={course.id} className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-foreground">{course.courseCode}</p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">{course.courseTitle}</p>
                      <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground/60">
                        {course.semester} · {course.academicYear} · {course.classGroup}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-2xl font-black text-foreground">{course.rate}%</p>
                      <p className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">Rate</p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${courseRateClass(course.rate)}`}
                      style={{ width: `${course.rate}%` }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    <div className="rounded-xl border border-border/30 bg-muted/25 p-2">
                      <p className="text-sm font-black">{course.total}</p>
                      <p className="text-[0.62rem] font-bold uppercase text-muted-foreground">Total</p>
                    </div>
                    <div className="rounded-xl border border-border/30 bg-muted/25 p-2">
                      <p className="text-sm font-black text-emerald-600">{course.credited}</p>
                      <p className="text-[0.62rem] font-bold uppercase text-muted-foreground">Credited</p>
                    </div>
                    <div className="rounded-xl border border-border/30 bg-muted/25 p-2">
                      <p className="text-sm font-black text-amber-600">{course.late}</p>
                      <p className="text-[0.62rem] font-bold uppercase text-muted-foreground">Late</p>
                    </div>
                    <div className="rounded-xl border border-border/30 bg-muted/25 p-2">
                      <p className="text-sm font-black text-rose-600">{course.absent}</p>
                      <p className="text-[0.62rem] font-bold uppercase text-muted-foreground">Absent</p>
                    </div>
                  </div>
                </div>
              ))}
              {courseSummaries.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
                  <History className="size-8 text-muted-foreground/35" />
                  <p className="font-semibold text-muted-foreground/70">No enrolled courses found.</p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel glass-panel-hover overflow-hidden relative border-border/40">
          <div className="absolute inset-x-0 top-0 h-1 bg-rose-500" />
          <CardHeader className="border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01]">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <AlertTriangle className="size-5 text-rose-600" />
              Missed Classes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/20">
              {missedRows.slice(0, 8).map((record) => (
                <div key={record.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-foreground">{record.courseCode}</p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">{record.sessionTitle}</p>
                    </div>
                    <StatusBadge status="absent" />
                  </div>
                  <p className="mt-3 text-xs font-bold text-muted-foreground">{formatDate(record.sessionDate)}</p>
                  {record.remarks ? (
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{record.remarks}</p>
                  ) : null}
                </div>
              ))}
              {missedRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
                  <CheckCircle2 className="size-8 text-emerald-500/60" />
                  <p className="font-semibold text-muted-foreground/70">No missed class in this view.</p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel glass-panel-hover overflow-hidden relative border-border/40 mt-6">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
        <CardHeader className="border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01]">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <History className="size-5 text-primary" />
            Detailed Attendance Log
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 px-0">
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-950/[0.02] dark:bg-white/[0.01]">
                <TableRow className="hover:bg-transparent border-b border-border/30">
                  <TableHead className="px-6 py-3 font-semibold text-muted-foreground text-xs">Course</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Session</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Date</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Status</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Check-in</TableHead>
                  <TableHead className="px-6 py-3 text-right font-semibold text-muted-foreground text-xs">Verification</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/30 border-b border-border/20 transition-colors">
                    <TableCell className="px-6 py-4.5 font-bold text-foreground text-sm">
                      <span className="font-extrabold text-foreground">{record.courseCode}</span>
                      <span className="block text-[0.7rem] text-muted-foreground font-semibold mt-1">{record.courseTitle}</span>
                    </TableCell>
                    <TableCell className="px-4 py-4.5 font-semibold text-foreground/80 text-xs">{record.sessionTitle}</TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">
                      {formatDate(record.sessionDate)}
                    </TableCell>
                    <TableCell className="px-4 py-4.5">
                      <StatusBadge status={record.status} />
                    </TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">
                      {formatDateTime(record.checkInAt)}
                    </TableCell>
                    <TableCell className="px-6 py-4.5 text-right text-xs font-bold capitalize text-muted-foreground">
                      {record.verificationMethod.replaceAll("_", " ")}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-44 text-center text-muted-foreground text-xs" colSpan={6}>
                      <div className="flex flex-col items-center justify-center gap-3 py-6">
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground/35">
                          <History className="size-6" />
                        </span>
                        <p className="font-semibold text-muted-foreground/60 text-sm">No attendance records match this view.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden divide-y divide-border/20">
            {rows.map((record) => (
              <div key={record.id} className="p-5 flex flex-col gap-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-extrabold text-foreground leading-snug">{record.courseCode}</span>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 truncate leading-relaxed">
                      {record.courseTitle}
                    </p>
                  </div>
                  <StatusBadge status={record.status} />
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-950/[0.015] dark:bg-white/[0.015] p-3 rounded-xl border border-border/25">
                  <div>
                    <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Session</span>
                    <span className="font-bold text-foreground/80 mt-0.5 block truncate">{record.sessionTitle}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Verification</span>
                    <div className="mt-0.5 text-xs font-bold capitalize text-foreground">
                      {record.verificationMethod.replaceAll("_", " ")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-border/15">
                  <span className="text-[9px] text-muted-foreground/50 font-black uppercase tracking-wider">Session date</span>
                  <span className="font-bold text-foreground/80">{formatDate(record.sessionDate)}</span>
                </div>
              </div>
            ))}
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 px-6">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground/35">
                  <History className="size-6" />
                </span>
                <p className="font-semibold text-muted-foreground/60 text-sm">No attendance records match this view.</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
