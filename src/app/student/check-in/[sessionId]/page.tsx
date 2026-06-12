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
  review: "Your submission requires lecturer review.",
  outside: "Your location is outside the permitted lecture area.",
  closed: "This attendance session is closed.",
  duplicate: "Attendance has already been recorded for this session.",
  "invalid-passkey": "The passkey is incorrect.",
  "passkey-used": "This passkey has already been used.",
  "expired-passkey": "This passkey has expired.",
  "location-required": "Location permission is required.",
  "invalid-location": "The submitted location is invalid.",
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
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Attendance submission</CardTitle>
          <CardDescription>
            Final close: {session.finalClosesAt.toLocaleString()}. Required GPS accuracy:{" "}
            {session.maxAcceptedAccuracyMeters}m.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resultMessage ? (
            <p className="mb-5 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
              {resultMessage}
            </p>
          ) : null}
          <StudentAttendanceForm
            action={checkInAction}
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
