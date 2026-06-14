import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { Pencil } from "lucide-react";

import {
  approveAttemptAction,
  closeAttendanceSessionAction,
  deleteAttendanceSessionAction,
  generatePasskeysAction,
  rejectAttemptAction,
  updateAttendanceSessionAction,
} from "@/app/lecturer/sessions/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { PendingSubmitButton } from "@/components/pending-submit-button";
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
import { FormModal } from "@/components/form-modal";
import { LocationFields } from "@/components/location-fields";

function toDateTimeLocalValue(date: Date) {
  return date.toISOString().slice(0, 16);
}

const errorMessages: Record<string, string> = {
  time: "Opening time must be before normal close, and normal close must be before final close.",
  "lecturer-accuracy":
    "The lecturer location accuracy is above the selected limit. Recapture the location or increase the limit.",
  location: "Enter a valid latitude and longitude for the lecture location.",
  missing:
    "Complete all required session fields and keep or accept the captured session location.",
};
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
  attendancePasskeys,
  attendanceRecords,
  attendanceSessions,
  courses,
  enrolments,
  studentProfiles,
  users,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function LecturerSessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ passkeys?: string; modal?: string; error?: string }>;
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
      radius: attendanceSessions.geofenceRadiusMeters,
      maxAccuracy: attendanceSessions.maxAcceptedAccuracyMeters,
      lecturerLatitude: attendanceSessions.lecturerLatitude,
      lecturerLongitude: attendanceSessions.lecturerLongitude,
      lecturerLocationAccuracy: attendanceSessions.lecturerLocationAccuracy,
      courseId: attendanceSessions.courseId,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
    })
    .from(attendanceSessions)
    .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
    .where(
      and(
        eq(attendanceSessions.id, sessionId),
        eq(attendanceSessions.lecturerId, user.lecturerProfileId ?? ""),
      ),
    )
    .limit(1);

  if (!session) {
    return <PageHeader title="Session not found" />;
  }

  const [enrolledCount] = await db
    .select({ value: count() })
    .from(enrolments)
    .where(eq(enrolments.courseId, session.courseId));

  const [passkeyCount] = await db
    .select({ value: count() })
    .from(attendancePasskeys)
    .where(eq(attendancePasskeys.sessionId, session.id));

  const [presentCount] = await db
    .select({ value: count() })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.sessionId, session.id));

  const [reviewCount] = await db
    .select({ value: count() })
    .from(attendanceAttempts)
    .where(
      and(
        eq(attendanceAttempts.sessionId, session.id),
        eq(attendanceAttempts.reviewStatus, "pending"),
      ),
    );

  const records = await db
    .select({
      id: attendanceRecords.id,
      name: users.name,
      studentIdNumber: studentProfiles.studentIdNumber,
      status: attendanceRecords.status,
      checkInAt: attendanceRecords.checkInAt,
      distance: attendanceRecords.calculatedDistanceMeters,
      accuracy: attendanceRecords.locationAccuracyMeters,
    })
    .from(attendanceRecords)
    .innerJoin(studentProfiles, eq(attendanceRecords.studentId, studentProfiles.id))
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(eq(attendanceRecords.sessionId, session.id));

  const attempts = await db
    .select({
      id: attendanceAttempts.id,
      name: users.name,
      studentIdNumber: studentProfiles.studentIdNumber,
      result: attendanceAttempts.result,
      rejectionReason: attendanceAttempts.rejectionReason,
      reviewStatus: attendanceAttempts.reviewStatus,
      attemptedAt: attendanceAttempts.attemptedAt,
      distance: attendanceAttempts.calculatedDistanceMeters,
      accuracy: attendanceAttempts.locationAccuracyMeters,
    })
    .from(attendanceAttempts)
    .leftJoin(studentProfiles, eq(attendanceAttempts.studentId, studentProfiles.id))
    .leftJoin(users, eq(studentProfiles.userId, users.id))
    .where(eq(attendanceAttempts.sessionId, session.id));

  return (
    <>
      <PageHeader
        title={session.title}
        description={`${session.courseCode}: ${session.courseTitle}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/lecturer/courses/${session.courseId}/sessions/${session.id}/reviews`}>
                Reviews
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/lecturer/sessions/${session.id}?modal=edit`}>
                <Pencil className="size-4" />
                Edit session
              </Link>
            </Button>
            <form action={generatePasskeysAction}>
              <input name="sessionId" type="hidden" value={session.id} />
              <PendingSubmitButton pendingLabel="Generating..." variant="outline">
                Generate passkeys
              </PendingSubmitButton>
            </form>
            <form action={closeAttendanceSessionAction}>
              <input name="sessionId" type="hidden" value={session.id} />
              <ConfirmSubmitButton
                message="Close this session and mark every enrolled student without attendance as absent?"
                variant="default"
              >
                Close session
              </ConfirmSubmitButton>
            </form>
            <form action={deleteAttendanceSessionAction}>
              <input name="sessionId" type="hidden" value={session.id} />
              <ConfirmSubmitButton message="Delete this attendance session? This will remove related passkeys, attendance records, and attempts.">
                Delete session
              </ConfirmSubmitButton>
            </form>
          </>
        }
      />
      {query.passkeys ? (
        <p className="mb-6 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
          Generated passkeys for {query.passkeys} enrolled student(s).
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Enrolled" value={enrolledCount.value} tone="info" />
        <StatCard label="Passkeys" value={passkeyCount.value} />
        <StatCard label="Recorded" value={presentCount.value} tone="success" />
        <StatCard label="Awaiting review" value={reviewCount.value} tone="warning" />
        <StatCard label="Status" value={session.status} />
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Session rules</CardTitle>
          <CardDescription>
            Opens {session.opensAt.toLocaleString()}, normal close{" "}
            {session.normalClosesAt.toLocaleString()}, final close{" "}
            {session.finalClosesAt.toLocaleString()}.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Radius: {session.radius}m. Max accepted accuracy: {session.maxAccuracy}m.
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Attendance records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Accuracy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {record.name} ({record.studentIdNumber})
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={record.status} />
                  </TableCell>
                  <TableCell>{record.checkInAt.toLocaleString()}</TableCell>
                  <TableCell>{record.distance ?? "-"}m</TableCell>
                  <TableCell>{record.accuracy ?? "-"}m</TableCell>
                </TableRow>
              ))}
              {records.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={5}>
                    No accepted attendance yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Attempts and review queue</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Attempted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell>
                    {attempt.name
                      ? `${attempt.name} (${attempt.studentIdNumber})`
                      : "Unknown student"}
                  </TableCell>
                  <TableCell>{attempt.result}</TableCell>
                  <TableCell>{attempt.rejectionReason ?? "-"}</TableCell>
                  <TableCell>
                    {attempt.reviewStatus === "pending" ? (
                      <div className="flex flex-wrap gap-2">
                        <form action={approveAttemptAction}>
                          <input name="attemptId" type="hidden" value={attempt.id} />
                          <PendingSubmitButton
                            pendingLabel="Approving..."
                            size="sm"
                            variant="outline"
                          >
                            Approve
                          </PendingSubmitButton>
                        </form>
                        <form action={rejectAttemptAction}>
                          <input name="attemptId" type="hidden" value={attempt.id} />
                          <PendingSubmitButton
                            pendingLabel="Rejecting..."
                            size="sm"
                            variant="outline"
                          >
                            Reject
                          </PendingSubmitButton>
                        </form>
                      </div>
                    ) : (
                      attempt.reviewStatus
                    )}
                  </TableCell>
                  <TableCell>{attempt.attemptedAt.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {attempts.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={5}>
                    No attempts have been submitted yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Session Modal */}
      <FormModal
        isOpen={query.modal === "edit"}
        title="Edit attendance session"
        description={`${session.courseCode}: ${session.courseTitle}`}
        className="sm:max-w-4xl"
      >
        <div className="grid gap-6 pt-2 lg:grid-cols-[1fr_320px]">
          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-0">
              <form action={updateAttendanceSessionAction} className="grid gap-4 sm:grid-cols-2">
                <input name="sessionId" type="hidden" value={session.id} />
                <input name="source" type="hidden" value="detail" />
                {query.error && errorMessages[query.error] ? (
                  <p className="sm:col-span-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed">
                    {errorMessages[query.error]}
                  </p>
                ) : null}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Course</Label>
                  <div className="rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground font-semibold">
                    {session.courseCode}: {session.courseTitle}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 font-medium leading-relaxed">
                    Course ownership is fixed for an existing session.
                  </p>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="sessionTitle" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Session title</Label>
                  <Input
                    defaultValue={session.title}
                    id="sessionTitle"
                    name="sessionTitle"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="geofenceRadiusMeters" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Attendance radius</Label>
                  <Input
                    defaultValue={session.radius}
                    id="geofenceRadiusMeters"
                    min={10}
                    name="geofenceRadiusMeters"
                    required
                    type="number"
                  />
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    Students outside this distance from the captured lecture location are flagged or rejected.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxAcceptedAccuracyMeters" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">GPS accuracy limit</Label>
                  <Input
                    defaultValue={session.maxAccuracy}
                    id="maxAcceptedAccuracyMeters"
                    min={10}
                    name="maxAcceptedAccuracyMeters"
                    required
                    type="number"
                  />
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    The lecturer and students must have GPS accuracy within this range in metres.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="opensAt" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opens at</Label>
                  <Input
                    defaultValue={toDateTimeLocalValue(session.opensAt)}
                    id="opensAt"
                    name="opensAt"
                    required
                    type="datetime-local"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="normalClosesAt" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Normal closes at</Label>
                  <Input
                    defaultValue={toDateTimeLocalValue(session.normalClosesAt)}
                    id="normalClosesAt"
                    name="normalClosesAt"
                    required
                    type="datetime-local"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="finalClosesAt" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Final closes at</Label>
                  <Input
                    defaultValue={toDateTimeLocalValue(session.finalClosesAt)}
                    id="finalClosesAt"
                    name="finalClosesAt"
                    required
                    type="datetime-local"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lecturer location</Label>
                  <LocationFields
                    accuracyName="lecturerLocationAccuracy"
                    allowManualEntry
                    initialAccuracy={session.lecturerLocationAccuracy}
                    initialLatitude={session.lecturerLatitude}
                    initialLongitude={session.lecturerLongitude}
                    latitudeName="lecturerLatitude"
                    longitudeName="lecturerLongitude"
                    maxAccuracyInputId="maxAcceptedAccuracyMeters"
                    requireAcceptance
                  />
                </div>
                <div className="sm:col-span-2 pt-2">
                  <Button className="w-full py-5 rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg text-sm" type="submit">Save session changes</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 bg-destructive/5 dark:bg-destructive/2 h-fit self-start">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-destructive">Delete session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs text-muted-foreground">
              <p className="leading-relaxed">
                Deleting this session removes its passkeys, attendance records, and review attempts.
              </p>
              <form action={deleteAttendanceSessionAction}>
                <input name="sessionId" type="hidden" value={session.id} />
                <ConfirmSubmitButton message="Delete this attendance session? This will remove related passkeys, attendance records, and attempts." className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8.5 rounded-lg flex items-center justify-center gap-1.5 font-bold">
                  Delete session
                </ConfirmSubmitButton>
              </form>
            </CardContent>
          </Card>
        </div>
      </FormModal>
    </>
  );
}
