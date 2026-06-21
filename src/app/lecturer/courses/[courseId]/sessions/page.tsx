import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDb } from "@/db/client";
import { attendanceSessions, courses, lectureHalls } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { FormModal } from "@/components/form-modal";
import { SessionLocationFields } from "@/components/session-location-fields";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createAttendanceSessionAction } from "@/app/lecturer/sessions/actions";

export default async function CourseSessionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ modal?: string; error?: string }>;
}) {
  const { courseId } = await params;
  const query = await searchParams;
  const user = await requireRole("lecturer");
  const db = getDb();

  const errorMessages: Record<string, string> = {
    time: "Opening time must be before normal close, and normal close must be before final close.",
    "lecturer-accuracy":
      "The captured lecturer location accuracy is above the selected limit. Recapture closer to the class location or increase the limit.",
    location: "Enter a valid latitude and longitude for the lecture location.",
    missing:
      "Complete all required session fields and accept the captured lecture location.",
  };

  const [course] = await db
    .select()
    .from(courses)
    .where(
      and(
        eq(courses.id, courseId),
        eq(courses.lecturerId, user.lecturerProfileId ?? ""),
      ),
    )
    .limit(1);

  if (!course) {
    return <PageHeader title="Course not found" />;
  }

  const sessions = await db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.courseId, course.id))
    .orderBy(desc(attendanceSessions.opensAt));
  const mappedLectureHalls = await db
    .select()
    .from(lectureHalls)
    .where(eq(lectureHalls.status, "active"))
    .orderBy(lectureHalls.code);
  const mappedHallLocations = mappedLectureHalls.map((hall) => ({
    id: hall.id,
    label: `${hall.code}: ${hall.name}`,
    latitude: hall.latitude,
    longitude: hall.longitude,
    accuracy: hall.locationAccuracyMeters ?? hall.maxAcceptedAccuracyMeters,
    radiusMeters: hall.geofenceRadiusMeters,
    maxAccuracyMeters: hall.maxAcceptedAccuracyMeters,
  }));

  return (
    <>
      <PageHeader
        title={`${course.courseCode} sessions`}
        description={`${course.courseTitle} / ${course.academicYear} / ${course.semester}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/lecturer/courses/${course.id}`}>Course overview</Link>
            </Button>
            <Button asChild>
              <Link href={`/lecturer/courses/${course.id}/sessions?modal=new`}>
                <Plus className="size-4" />
                New session
              </Link>
            </Button>
          </>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Opens</TableHead>
                <TableHead>Final close</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.sessionTitle}</TableCell>
                  <TableCell>{session.opensAt.toLocaleString()}</TableCell>
                  <TableCell>{session.finalClosesAt.toLocaleString()}</TableCell>
                  <TableCell>
                    <StatusBadge status={session.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/lecturer/courses/${course.id}/sessions/${session.id}`}
                      >
                        Manage
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="h-24 text-center text-muted-foreground"
                    colSpan={5}
                  >
                    No attendance sessions have been created for this course.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Start Session Modal */}
      <FormModal
        isOpen={query.modal === "new"}
        title="Start attendance session"
        description="Capture the lecture location, set the attendance radius, and define normal and final closing times."
        className="sm:max-w-2xl"
      >
        <form action={createAttendanceSessionAction} className="grid gap-4 sm:grid-cols-2 pt-2">
          <input name="courseId" type="hidden" value={course.id} />
          <input name="source" type="hidden" value="course" />
          {query.error && errorMessages[query.error] ? (
            <p className="sm:col-span-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed">
              {errorMessages[query.error]}
            </p>
          ) : null}
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Course</Label>
            <div className="rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground font-semibold">
              {course.courseCode}: {course.courseTitle}
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sessionTitle" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Session title</Label>
            <Input id="sessionTitle" name="sessionTitle" required placeholder="e.g. Week 1 Lecture" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="geofenceRadiusMeters" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Attendance radius</Label>
            <Input
              defaultValue={30}
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
              defaultValue={50}
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
            <Input id="opensAt" name="opensAt" required type="datetime-local" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="normalClosesAt" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Normal closes at</Label>
            <Input id="normalClosesAt" name="normalClosesAt" required type="datetime-local" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="finalClosesAt" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Final closes at</Label>
            <Input id="finalClosesAt" name="finalClosesAt" required type="datetime-local" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lecturer location</Label>
            <SessionLocationFields
              accuracyName="lecturerLocationAccuracy"
              latitudeName="lecturerLatitude"
              lectureHallInputName="lectureHallId"
              longitudeName="lecturerLongitude"
              mappedLectureHalls={mappedHallLocations}
              maxAccuracyInputId="maxAcceptedAccuracyMeters"
              radiusInputId="geofenceRadiusMeters"
            />
          </div>
          <div className="sm:col-span-2 pt-2">
            <Button className="w-full py-5 rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg text-sm" type="submit">
              Open attendance session
            </Button>
          </div>
        </form>
      </FormModal>
    </>
  );
}
