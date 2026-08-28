import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import { Pencil, QrCode } from "lucide-react";

import {
  closeAttendanceSessionAction,
  deleteAttendanceSessionAction,
  markAbsentRecordPresentAction,
  updateAttendanceSessionAction,
} from "@/app/lecturer/sessions/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { FormModal } from "@/components/form-modal";
import { LiveRosterRefresh } from "@/components/live-roster-refresh";
import { PageHeader } from "@/components/page-header";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { RotatingAttendanceQr } from "@/components/rotating-attendance-qr";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  attendanceAttempts,
  attendanceRecords,
  attendanceSessions,
  courses,
  enrolments,
  lectureHalls,
  studentProfiles,
  users,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";

function toDateTimeLocalValue(date: Date) {
  return date.toISOString().slice(0, 16);
}

export default async function LecturerSessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ modal?: string; error?: string }>;
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
      lectureHallId: attendanceSessions.lectureHallId,
      lectureHallName: lectureHalls.name,
      lectureHallCode: lectureHalls.code,
      courseId: attendanceSessions.courseId,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
    })
    .from(attendanceSessions)
    .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
    .leftJoin(lectureHalls, eq(attendanceSessions.lectureHallId, lectureHalls.id))
    .where(
      and(
        eq(attendanceSessions.id, sessionId),
        eq(attendanceSessions.lecturerId, user.lecturerProfileId ?? ""),
      ),
    )
    .limit(1);

  if (!session) return <PageHeader title="Session not found" />;

  const [[enrolledCount], [recordedCount], [rejectedCount], halls, records, attempts] =
    await Promise.all([
      db.select({ value: count() }).from(enrolments).where(
        and(eq(enrolments.courseId, session.courseId), eq(enrolments.status, "active")),
      ),
      db.select({ value: count() }).from(attendanceRecords).where(
        eq(attendanceRecords.sessionId, session.id),
      ),
      db.select({ value: count() }).from(attendanceAttempts).where(
        and(
          eq(attendanceAttempts.sessionId, session.id),
          eq(attendanceAttempts.result, "rejected"),
        ),
      ),
      db.select().from(lectureHalls).where(eq(lectureHalls.status, "active")),
      db
        .select({
          id: attendanceRecords.id,
          name: users.name,
          studentIdNumber: studentProfiles.studentIdNumber,
          status: attendanceRecords.status,
          checkInAt: attendanceRecords.checkInAt,
          verificationMethod: attendanceRecords.verificationMethod,
        })
        .from(attendanceRecords)
        .innerJoin(studentProfiles, eq(attendanceRecords.studentId, studentProfiles.id))
        .innerJoin(users, eq(studentProfiles.userId, users.id))
        .where(eq(attendanceRecords.sessionId, session.id))
        .orderBy(desc(attendanceRecords.checkInAt)),
      db
        .select({
          id: attendanceAttempts.id,
          name: users.name,
          studentIdNumber: studentProfiles.studentIdNumber,
          result: attendanceAttempts.result,
          rejectionReason: attendanceAttempts.rejectionReason,
          attemptedAt: attendanceAttempts.attemptedAt,
        })
        .from(attendanceAttempts)
        .leftJoin(studentProfiles, eq(attendanceAttempts.studentId, studentProfiles.id))
        .leftJoin(users, eq(studentProfiles.userId, users.id))
        .where(eq(attendanceAttempts.sessionId, session.id))
        .orderBy(desc(attendanceAttempts.attemptedAt))
        .limit(20),
    ]);

  const now = new Date();
  const qrAvailable =
    session.status === "open" && now >= session.opensAt && now <= session.finalClosesAt;
  const errorMessage =
    query.error === "time"
      ? "Opening time must be before normal close, and normal close must be before final close."
      : query.error
        ? "Complete all required session fields and select a valid venue."
        : null;

  return (
    <>
      <LiveRosterRefresh enabled={qrAvailable} />
      <PageHeader
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/lecturer/sessions/${session.id}?modal=edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
            {session.status === "open" ? (
              <form action={closeAttendanceSessionAction}>
                <input name="sessionId" type="hidden" value={session.id} />
                <ConfirmSubmitButton message="Close this session and mark students without attendance as absent?">
                  Close session
                </ConfirmSubmitButton>
              </form>
            ) : null}
            <form action={deleteAttendanceSessionAction}>
              <input name="sessionId" type="hidden" value={session.id} />
              <ConfirmSubmitButton
                message="Delete this session and all related attendance records?"
                variant="outline"
              >
                Delete
              </ConfirmSubmitButton>
            </form>
          </>
        }
        description={`${session.courseCode}: ${session.courseTitle}`}
        title={session.title}
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Enrolled" tone="info" value={enrolledCount.value} />
        <StatCard label="Recorded" tone="success" value={recordedCount.value} />
        <StatCard label="Rejected scans" tone="warning" value={rejectedCount.value} />
        <StatCard label="Status" value={session.status} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card className="overflow-hidden border-border/50">
          <CardHeader className="border-b border-border/40">
            <CardTitle className="flex items-center gap-2 text-base">
              <QrCode className="size-4 text-primary" />
              Rotating QR
            </CardTitle>
            <CardDescription>
              Students scan this code from their authenticated account.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {qrAvailable ? (
              <RotatingAttendanceQr sessionId={session.id} />
            ) : (
              <div className="grid min-h-80 place-items-center px-6 text-center">
                <div>
                  <QrCode className="mx-auto size-12 text-muted-foreground/25" />
                  <p className="mt-4 text-sm font-bold text-foreground">QR display unavailable</p>
                  <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
                    The rotating QR is available only while this session is open and within its scheduled attendance window.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Session schedule</CardTitle>
            <CardDescription>
              {session.lectureHallName
                ? `${session.lectureHallCode}: ${session.lectureHallName}`
                : "No venue assigned"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <ScheduleRow label="Opens" value={session.opensAt.toLocaleString()} />
            <ScheduleRow label="Present until" value={session.normalClosesAt.toLocaleString()} />
            <ScheduleRow label="Final close" value={session.finalClosesAt.toLocaleString()} />
            <div className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
              The QR changes every three seconds. The current and immediately previous code are accepted to accommodate camera and network delay.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Live attendance roster</CardTitle>
          <CardDescription>Updates every three seconds while the QR is active.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6">Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead className="px-6 text-right">Correction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="px-6 font-semibold">
                    {record.name} ({record.studentIdNumber})
                  </TableCell>
                  <TableCell><StatusBadge status={record.status} /></TableCell>
                  <TableCell>{record.checkInAt.toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{record.verificationMethod.replaceAll("_", " ")}</TableCell>
                  <TableCell className="px-6 text-right">
                    {session.status === "closed" && record.status === "absent" ? (
                      <form action={markAbsentRecordPresentAction}>
                        <input name="recordId" type="hidden" value={record.id} />
                        <PendingSubmitButton pendingLabel="Updating..." size="sm" variant="outline">
                          Mark present
                        </PendingSubmitButton>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {records.length === 0 ? (
                <TableRow><TableCell className="h-28 text-center text-muted-foreground" colSpan={5}>No attendance recorded yet.</TableCell></TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6 overflow-hidden border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Recent scan activity</CardTitle>
          <CardDescription>Accepted, late, duplicate, and rejected scan events.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader><TableRow><TableHead className="px-6">Student</TableHead><TableHead>Result</TableHead><TableHead>Reason</TableHead><TableHead className="px-6">Attempted</TableHead></TableRow></TableHeader>
            <TableBody>
              {attempts.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell className="px-6">{attempt.name ? `${attempt.name} (${attempt.studentIdNumber})` : "Unknown student"}</TableCell>
                  <TableCell className="capitalize">{attempt.result.replaceAll("_", " ")}</TableCell>
                  <TableCell className="capitalize">{attempt.rejectionReason?.replaceAll("_", " ") ?? "-"}</TableCell>
                  <TableCell className="px-6">{attempt.attemptedAt.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {attempts.length === 0 ? (
                <TableRow><TableCell className="h-24 text-center text-muted-foreground" colSpan={4}>No scan activity yet.</TableCell></TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FormModal
        description={`${session.courseCode}: ${session.courseTitle}`}
        isOpen={query.modal === "edit"}
        title="Edit attendance session"
      >
        <form action={updateAttendanceSessionAction} className="grid gap-4 sm:grid-cols-2">
          <input name="sessionId" type="hidden" value={session.id} />
          <input name="source" type="hidden" value="detail" />
          {errorMessage ? (
            <p className="border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs font-semibold text-destructive sm:col-span-2">{errorMessage}</p>
          ) : null}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sessionTitle">Session title</Label>
            <Input defaultValue={session.title} id="sessionTitle" name="sessionTitle" required />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lectureHallId">Venue</Label>
            <select className="h-9 w-full rounded-lg border bg-card px-3 text-sm" defaultValue={session.lectureHallId ?? ""} id="lectureHallId" name="lectureHallId">
              <option value="">No venue</option>
              {halls.map((hall) => <option key={hall.id} value={hall.id}>{hall.code}: {hall.name}</option>)}
            </select>
          </div>
          <DateTimeField defaultValue={toDateTimeLocalValue(session.opensAt)} id="opensAt" label="Opens at" />
          <DateTimeField defaultValue={toDateTimeLocalValue(session.normalClosesAt)} id="normalClosesAt" label="Present until" />
          <div className="sm:col-span-2"><DateTimeField defaultValue={toDateTimeLocalValue(session.finalClosesAt)} id="finalClosesAt" label="Final close" /></div>
          <Button className="sm:col-span-2" type="submit">Save session changes</Button>
        </form>
      </FormModal>
    </>
  );
}

function ScheduleRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-3"><span className="text-xs font-bold text-muted-foreground">{label}</span><span className="text-right text-xs font-semibold text-foreground">{value}</span></div>;
}

function DateTimeField({ defaultValue, id, label }: { defaultValue: string; id: string; label: string }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><Input defaultValue={defaultValue} id={id} name={id} required type="datetime-local" /></div>;
}
