import { asc, desc, eq } from "drizzle-orm";
import { AlertTriangle, Download, Filter } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  attendanceRecords,
  attendanceSessions,
  courses,
  enrolments,
  studentProfiles,
  users,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";

type SearchParams = {
  courseId?: string;
  comparison?: string;
  threshold?: string;
};

const successfulStatuses = new Set(["present", "late", "manually_present"]);

function percentage(attended: number, total: number) {
  return total === 0 ? null : Math.round((attended / total) * 100);
}

function clampThreshold(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "50", 10);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : 50;
}

function percentageLabel(value: number | null) {
  return value === null ? "N/A" : `${value}%`;
}

export default async function LecturerReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const user = await requireRole("lecturer");
  const lecturerId = user.lecturerProfileId ?? "";
  const db = getDb();
  const courseOptions = await db
    .select()
    .from(courses)
    .where(eq(courses.lecturerId, lecturerId))
    .orderBy(desc(courses.createdAt));

  const selectedCourse =
    courseOptions.find((course) => course.id === params.courseId) ?? courseOptions[0];
  const threshold = clampThreshold(params.threshold);
  const comparison = ["all", "at_or_above", "below"].includes(params.comparison ?? "")
    ? params.comparison!
    : "all";

  if (!selectedCourse) {
    return (
      <>
        <PageHeader title="Attendance report" description="Course and student attendance analysis." />
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No courses are available for reporting.
          </CardContent>
        </Card>
      </>
    );
  }

  const [sessions, enrolledStudents, records] = await Promise.all([
    db
      .select({
        id: attendanceSessions.id,
        title: attendanceSessions.sessionTitle,
        sessionDate: attendanceSessions.sessionDate,
        status: attendanceSessions.status,
      })
      .from(attendanceSessions)
      .where(eq(attendanceSessions.courseId, selectedCourse.id))
      .orderBy(asc(attendanceSessions.sessionDate)),
    db
      .select({
        studentId: studentProfiles.id,
        studentIdNumber: studentProfiles.studentIdNumber,
        name: users.name,
        enrolmentStatus: enrolments.status,
        enrolledAt: enrolments.enrolledAt,
      })
      .from(enrolments)
      .innerJoin(studentProfiles, eq(enrolments.studentId, studentProfiles.id))
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .where(eq(enrolments.courseId, selectedCourse.id))
      .orderBy(asc(users.name)),
    db
      .select({
        sessionId: attendanceRecords.sessionId,
        studentId: attendanceRecords.studentId,
        status: attendanceRecords.status,
      })
      .from(attendanceRecords)
      .innerJoin(attendanceSessions, eq(attendanceRecords.sessionId, attendanceSessions.id))
      .where(eq(attendanceSessions.courseId, selectedCourse.id)),
  ]);

  const recordByStudentSession = new Map(
    records.map((record) => [`${record.studentId}:${record.sessionId}`, record.status]),
  );
  const recordsBySession = new Map<string, typeof records>();

  for (const record of records) {
    const sessionRecords = recordsBySession.get(record.sessionId) ?? [];
    sessionRecords.push(record);
    recordsBySession.set(record.sessionId, sessionRecords);
  }

  const sessionRows = [...sessions].reverse().map((session) => {
    const sessionRecords = recordsBySession.get(session.id) ?? [];
    const successfulCount = sessionRecords.filter((record) =>
      successfulStatuses.has(record.status),
    ).length;
    const absentCount = sessionRecords.filter((record) => record.status === "absent").length;
    const enrolledCount = enrolledStudents.filter(
      (student) => student.enrolledAt <= session.sessionDate,
    ).length;

    return {
      ...session,
      absentCount,
      enrolledCount,
      successfulCount,
      attendancePercentage: percentage(successfulCount, enrolledCount),
    };
  });

  const closedSessions = sessions.filter((session) => session.status === "closed");
  const studentRows = enrolledStudents.map((student) => {
    const eligibleSessions = closedSessions.filter(
      (session) => session.sessionDate >= student.enrolledAt,
    );
    const attendedClosedCount = eligibleSessions.filter((session) =>
      successfulStatuses.has(
        recordByStudentSession.get(`${student.studentId}:${session.id}`) ?? "",
      ),
    ).length;
    const absentCount = eligibleSessions.filter(
      (session) =>
        recordByStudentSession.get(`${student.studentId}:${session.id}`) === "absent",
    ).length;
    const successfulCheckIns = sessions.filter((session) =>
      successfulStatuses.has(
        recordByStudentSession.get(`${student.studentId}:${session.id}`) ?? "",
      ),
    ).length;
    let consecutiveAbsences = 0;

    for (const session of [...eligibleSessions].reverse()) {
      if (recordByStudentSession.get(`${student.studentId}:${session.id}`) !== "absent") {
        break;
      }
      consecutiveAbsences += 1;
    }

    return {
      ...student,
      absentCount,
      attendedClosedCount,
      attendancePercentage: percentage(attendedClosedCount, eligibleSessions.length),
      closedSessionCount: eligibleSessions.length,
      consecutiveAbsences,
      successfulCheckIns,
    };
  });

  const filteredStudents = studentRows.filter((student) => {
    if (comparison === "all") return true;
    if (student.attendancePercentage === null) return false;
    return comparison === "at_or_above"
      ? student.attendancePercentage >= threshold
      : student.attendancePercentage < threshold;
  });
  const totalSuccessfulCheckIns = records.filter((record) =>
    successfulStatuses.has(record.status),
  ).length;
  const flaggedStudents = studentRows.filter(
    (student) => student.consecutiveAbsences >= 3,
  ).length;

  return (
    <>
      <PageHeader
        title="Attendance report"
        description={`${selectedCourse.courseCode}: ${selectedCourse.courseTitle}`}
        actions={
          <Button asChild variant="outline">
            <a href={`/api/reports/attendance?courseId=${selectedCourse.id}`}>
              <Download className="size-4" />
              Export register
            </a>
          </Button>
        }
      />

      <Card className="mb-6 border-border/50">
        <CardContent className="pt-6">
          <form className="grid gap-4 lg:grid-cols-[minmax(240px,1fr)_150px_180px_auto] lg:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="courseId">Course</Label>
              <select
                className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm"
                defaultValue={selectedCourse.id}
                id="courseId"
                name="courseId"
              >
                {courseOptions.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.courseCode}: {course.courseTitle}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="threshold">Attendance threshold</Label>
              <div className="relative">
                <Input
                  className="pr-9"
                  defaultValue={threshold}
                  id="threshold"
                  max={100}
                  min={1}
                  name="threshold"
                  required
                  type="number"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comparison">Student results</Label>
              <select
                className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm"
                defaultValue={comparison}
                id="comparison"
                name="comparison"
              >
                <option value="all">All students</option>
                <option value="at_or_above">At or above threshold</option>
                <option value="below">Below threshold</option>
              </select>
            </div>
            <Button type="submit">
              <Filter className="size-4" />
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Lecture sessions" value={sessions.length} />
        <StatCard label="Completed sessions" value={closedSessions.length} tone="info" />
        <StatCard label="Successful check-ins" value={totalSuccessfulCheckIns} tone="success" />
        <StatCard label="Three-session absence flags" value={flaggedStudents} tone="warning" />
      </div>

      <Card className="mt-6 overflow-hidden border-border/50">
        <CardHeader className="border-b border-border/40">
          <CardTitle className="text-base">Lecture session attendance</CardTitle>
          <CardDescription>Successful attendance counts for every session in this course.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <div className="hidden overflow-x-auto md:block">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6">Session</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Roster</TableHead>
                <TableHead>Successful</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead className="px-6 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessionRows.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="px-6 font-bold">{session.title}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{session.sessionDate.toLocaleString()}</TableCell>
                  <TableCell>{session.enrolledCount}</TableCell>
                  <TableCell className="font-bold text-emerald-700 dark:text-emerald-400">{session.successfulCount}</TableCell>
                  <TableCell>{session.absentCount}</TableCell>
                  <TableCell>{percentageLabel(session.attendancePercentage)}</TableCell>
                  <TableCell className="px-6 text-right"><StatusBadge status={session.status} /></TableCell>
                </TableRow>
              ))}
              {sessionRows.length === 0 ? (
                <TableRow><TableCell className="h-28 text-center text-muted-foreground" colSpan={7}>No lecture sessions have been recorded.</TableCell></TableRow>
              ) : null}
            </TableBody>
            </Table>
          </div>
          <div className="divide-y divide-border/40 md:hidden">
            {sessionRows.map((session) => (
              <div className="space-y-3 px-5 py-4" key={session.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{session.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{session.sessionDate.toLocaleString()}</p>
                  </div>
                  <StatusBadge status={session.status} />
                </div>
                <div className="grid grid-cols-4 gap-2 border border-border/40 bg-muted/20 p-3 text-center text-xs">
                  <ReportMetric label="Roster" value={session.enrolledCount} />
                  <ReportMetric label="Successful" value={session.successfulCount} />
                  <ReportMetric label="Absent" value={session.absentCount} />
                  <ReportMetric label="Attendance" value={percentageLabel(session.attendancePercentage)} />
                </div>
              </div>
            ))}
            {sessionRows.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-muted-foreground">No lecture sessions have been recorded.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 overflow-hidden border-border/50">
        <CardHeader className="border-b border-border/40">
          <CardTitle className="text-base">Student attendance summary</CardTitle>
          <CardDescription>
            {comparison === "all"
              ? `${filteredStudents.length} students`
              : `${filteredStudents.length} students ${comparison === "below" ? "below" : "at or above"} ${threshold}%`}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <div className="hidden overflow-x-auto md:block">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6">Student</TableHead>
                <TableHead>Successful check-ins</TableHead>
                <TableHead>Completed sessions</TableHead>
                <TableHead>Absences</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead className="px-6 text-right">Consecutive absences</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.studentId}>
                  <TableCell className="px-6">
                    <span className="block font-bold">{student.name}</span>
                    <span className="text-xs text-muted-foreground">{student.studentIdNumber} / {student.enrolmentStatus}</span>
                  </TableCell>
                  <TableCell className="font-bold">{student.successfulCheckIns}</TableCell>
                  <TableCell>{student.attendedClosedCount} / {student.closedSessionCount}</TableCell>
                  <TableCell>{student.absentCount}</TableCell>
                  <TableCell className="font-bold">{percentageLabel(student.attendancePercentage)}</TableCell>
                  <TableCell className="px-6 text-right">
                    {student.consecutiveAbsences >= 3 ? (
                      <span className="inline-flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="size-4" />
                        {student.consecutiveAbsences} missed
                      </span>
                    ) : student.consecutiveAbsences}
                  </TableCell>
                </TableRow>
              ))}
              {filteredStudents.length === 0 ? (
                <TableRow><TableCell className="h-28 text-center text-muted-foreground" colSpan={6}>No students match this attendance threshold.</TableCell></TableRow>
              ) : null}
            </TableBody>
            </Table>
          </div>
          <div className="divide-y divide-border/40 md:hidden">
            {filteredStudents.map((student) => (
              <div className="space-y-3 px-5 py-4" key={student.studentId}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{student.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{student.studentIdNumber} / {student.enrolmentStatus}</p>
                  </div>
                  <span className="shrink-0 font-bold">{percentageLabel(student.attendancePercentage)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 border border-border/40 bg-muted/20 p-3 text-center text-xs">
                  <ReportMetric label="Check-ins" value={student.successfulCheckIns} />
                  <ReportMetric label="Completed" value={`${student.attendedClosedCount} / ${student.closedSessionCount}`} />
                  <ReportMetric label="Absences" value={student.absentCount} />
                </div>
                {student.consecutiveAbsences >= 3 ? (
                  <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="size-4" />
                    {student.consecutiveAbsences} consecutive sessions missed
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Consecutive absences: {student.consecutiveAbsences}</p>
                )}
              </div>
            ))}
            {filteredStudents.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-muted-foreground">No students match this attendance threshold.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function ReportMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0">
      <span className="block text-[9px] font-bold uppercase text-muted-foreground">{label}</span>
      <span className="mt-1 block font-bold text-foreground">{value}</span>
    </div>
  );
}
