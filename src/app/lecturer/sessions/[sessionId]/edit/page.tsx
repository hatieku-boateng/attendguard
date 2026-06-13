import Link from "next/link";
import { and, eq } from "drizzle-orm";

import {
  deleteAttendanceSessionAction,
  updateAttendanceSessionAction,
} from "@/app/lecturer/sessions/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { LocationFields } from "@/components/location-fields";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/db/client";
import { attendanceSessions, courses } from "@/db/schema";
import { requireRole } from "@/lib/auth";

const errorMessages: Record<string, string> = {
  time: "Opening time must be before normal close, and normal close must be before final close.",
  "lecturer-accuracy":
    "The lecturer location accuracy is above the selected limit. Recapture the location or increase the limit.",
  location: "Enter a valid latitude and longitude for the lecture location.",
  missing:
    "Complete all required session fields and keep or accept the captured session location.",
};

function toDateTimeLocalValue(date: Date) {
  return date.toISOString().slice(0, 16);
}

export default async function EditSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ error?: string }>;
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

  const errorMessage = query.error ? errorMessages[query.error] : null;

  return (
    <>
      <PageHeader
        title="Edit attendance session"
        description={`${session.courseCode}: ${session.courseTitle}`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/lecturer/courses/${session.courseId}/sessions/${session.id}`}>
              Cancel
            </Link>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>{session.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateAttendanceSessionAction} className="grid gap-5 sm:grid-cols-2">
            <input name="sessionId" type="hidden" value={session.id} />
            {errorMessage ? (
              <p className="sm:col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <Label>Course</Label>
              <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                {session.courseCode}: {session.courseTitle}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Course ownership is fixed for an existing session.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sessionTitle">Session title</Label>
              <Input
                defaultValue={session.title}
                id="sessionTitle"
                name="sessionTitle"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="geofenceRadiusMeters">Attendance radius</Label>
              <Input
                defaultValue={session.radius}
                id="geofenceRadiusMeters"
                min={10}
                name="geofenceRadiusMeters"
                required
                type="number"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Students outside this distance from the captured lecture location are flagged or rejected.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxAcceptedAccuracyMeters">GPS accuracy limit</Label>
              <Input
                defaultValue={session.maxAccuracy}
                id="maxAcceptedAccuracyMeters"
                min={10}
                name="maxAcceptedAccuracyMeters"
                required
                type="number"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                The lecturer and students must have GPS accuracy within this range in metres.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="opensAt">Opens at</Label>
              <Input
                defaultValue={toDateTimeLocalValue(session.opensAt)}
                id="opensAt"
                name="opensAt"
                required
                type="datetime-local"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="normalClosesAt">Normal closes at</Label>
              <Input
                defaultValue={toDateTimeLocalValue(session.normalClosesAt)}
                id="normalClosesAt"
                name="normalClosesAt"
                required
                type="datetime-local"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="finalClosesAt">Final closes at</Label>
              <Input
                defaultValue={toDateTimeLocalValue(session.finalClosesAt)}
                id="finalClosesAt"
                name="finalClosesAt"
                required
                type="datetime-local"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Lecturer location</Label>
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
            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
              <Button asChild variant="outline">
                <Link href={`/lecturer/courses/${session.courseId}/sessions/${session.id}`}>
                  Cancel
                </Link>
              </Button>
              <Button type="submit">Save session changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Delete session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Deleting this session removes its passkeys, attendance records, and
            review attempts.
          </p>
          <form action={deleteAttendanceSessionAction}>
            <input name="sessionId" type="hidden" value={session.id} />
            <ConfirmSubmitButton message="Delete this attendance session? This will remove related passkeys, attendance records, and attempts.">
              Delete session
            </ConfirmSubmitButton>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
