import Link from "next/link";
import { and, eq } from "drizzle-orm";

import { createAttendanceSessionAction } from "@/app/lecturer/sessions/actions";
import { LocationFields } from "@/components/location-fields";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/db/client";
import { courses } from "@/db/schema";
import { requireRole } from "@/lib/auth";

function getErrorMessage(error?: string) {
  if (error === "time") {
    return "Opening time must be before normal close, and normal close must be before final close.";
  }

  if (error === "lecturer-accuracy") {
    return "The captured lecturer location accuracy is above the selected limit. Recapture closer to the class location or increase the limit.";
  }

  if (error === "location") {
    return "Enter a valid latitude and longitude for the lecture location.";
  }

  if (error) {
    return "Complete all required session fields and accept the captured lecture location.";
  }

  return null;
}

export default async function NewCourseSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { courseId } = await params;
  const query = await searchParams;
  const user = await requireRole("lecturer");
  const db = getDb();

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

  const errorMessage = getErrorMessage(query.error);

  return (
    <>
      <PageHeader
        title="New attendance session"
        description={`${course.courseCode}: ${course.courseTitle}`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/lecturer/courses/${course.id}`}>Back to course</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <form action={createAttendanceSessionAction} className="grid gap-5 sm:grid-cols-2">
            <input name="courseId" type="hidden" value={course.id} />
            <input name="source" type="hidden" value="course" />
            {errorMessage ? (
              <p className="sm:col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <Label>Course</Label>
              <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                {course.courseCode}: {course.courseTitle}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sessionTitle">Session title</Label>
              <Input id="sessionTitle" name="sessionTitle" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="geofenceRadiusMeters">Attendance radius</Label>
              <Input
                defaultValue={30}
                id="geofenceRadiusMeters"
                min={10}
                name="geofenceRadiusMeters"
                required
                type="number"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Students outside this distance from the captured lecture location are flagged for review.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxAcceptedAccuracyMeters">GPS accuracy limit</Label>
              <Input
                defaultValue={50}
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
              <Input id="opensAt" name="opensAt" required type="datetime-local" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="normalClosesAt">Normal closes at</Label>
              <Input id="normalClosesAt" name="normalClosesAt" required type="datetime-local" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="finalClosesAt">Final closes at</Label>
              <Input id="finalClosesAt" name="finalClosesAt" required type="datetime-local" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Lecturer location</Label>
              <LocationFields
                accuracyName="lecturerLocationAccuracy"
                allowManualEntry
                latitudeName="lecturerLatitude"
                longitudeName="lecturerLongitude"
                maxAccuracyInputId="maxAcceptedAccuracyMeters"
                requireAcceptance
              />
            </div>
            <div className="sm:col-span-2">
              <Button className="w-full" type="submit">
                Open attendance session
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
