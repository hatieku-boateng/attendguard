import { and, eq } from "drizzle-orm";

import { checkInAction } from "@/app/student/sessions/actions";
import { PageHeader } from "@/components/page-header";
import { StudentAttendanceForm } from "@/components/student-attendance-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db/client";
import { attendancePasskeys, attendanceSessions, courses } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { decryptPasskey } from "@/lib/passkeys";

const resultMessages: Record<string, string> = {
  present: "Attendance recorded as present.",
  late: "Attendance recorded as late.",
  review:
    "Your submission has been sent to your lecturer for review. It will only count after the lecturer approves it.",
  outside: "Your location is outside the permitted lecture area.",
  closed: "This attendance session is closed.",
  duplicate: "Attendance has already been recorded for this session.",
  "invalid-passkey": "The passkey is incorrect.",
  "passkey-used": "This passkey has already been used.",
  "expired-passkey": "This passkey has expired.",
  "location-required": "Location permission is required.",
  "invalid-location": "The submitted location is invalid.",
  "poor-accuracy": "Your GPS accuracy is not strong enough yet. Keep capturing until it is within the session limit.",
  "not-enrolled": "Your account is not enrolled in this course.",
  "too-many": "Too many failed attempts. Contact the lecturer.",
};

export default async function CheckInPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { sessionId } = await params;
  const query = await searchParams;
  const user = await requireRole("student");
  const db = getDb();

  const [session] = await db
    .select({
      id: attendanceSessions.id,
      title: attendanceSessions.sessionTitle,
      finalClosesAt: attendanceSessions.finalClosesAt,
      lecturerLatitude: attendanceSessions.lecturerLatitude,
      lecturerLongitude: attendanceSessions.lecturerLongitude,
      geofenceRadiusMeters: attendanceSessions.geofenceRadiusMeters,
      maxAcceptedAccuracyMeters: attendanceSessions.maxAcceptedAccuracyMeters,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
      passkeyCiphertext: attendancePasskeys.passkeyCiphertext,
    })
    .from(attendanceSessions)
    .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
    .leftJoin(
      attendancePasskeys,
      and(
        eq(attendancePasskeys.sessionId, attendanceSessions.id),
        eq(attendancePasskeys.studentId, user.studentProfileId ?? ""),
      ),
    )
    .where(eq(attendanceSessions.id, sessionId))
    .limit(1);

  if (!session) {
    return <PageHeader title="Session not found" />;
  }

  const passkey = decryptPasskey(session.passkeyCiphertext);
  const resultMessage = query.result ? resultMessages[query.result] : null;

  return (
    <>
      <PageHeader
        title="Check in"
        description={`${session.courseCode}: ${session.courseTitle} / ${session.title}`}
      />
      <Card className="max-w-2xl glass-panel glass-panel-hover overflow-hidden relative border-border/40">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
        <CardHeader className="border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01] pb-4">
          <CardTitle className="text-base font-bold text-foreground">Attendance submission</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Final close: {session.finalClosesAt.toLocaleString()}. Required GPS accuracy:{" "}
            {session.maxAcceptedAccuracyMeters}m.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {resultMessage ? (
            <p className="mb-5 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs font-semibold text-primary leading-relaxed">
              {resultMessage}
            </p>
          ) : null}
          <StudentAttendanceForm
            action={checkInAction}
            geofenceRadiusMeters={session.geofenceRadiusMeters}
            lecturerLatitude={Number(session.lecturerLatitude)}
            lecturerLongitude={Number(session.lecturerLongitude)}
            maxAcceptedAccuracyMeters={session.maxAcceptedAccuracyMeters}
            passkey={passkey ?? ""}
            result={query.result}
            sessionId={session.id}
          />
        </CardContent>
      </Card>
    </>
  );
}
