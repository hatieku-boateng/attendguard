import { eq } from "drizzle-orm";

import { createAttendanceSessionAction } from "@/app/lecturer/sessions/actions";
import { LocationFields } from "@/components/location-fields";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDb } from "@/db/client";
import { courses } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await requireRole("lecturer");
  const db = getDb();
  const lecturerCourses = await db
    .select()
    .from(courses)
    .where(eq(courses.lecturerId, user.lecturerProfileId ?? ""));

  return (
    <>
      <PageHeader
        title="New attendance session"
        description="Capture the lecture location, set the attendance radius, and define normal and final closing times."
      />
      <Card>
        <CardContent className="pt-6">
          <form action={createAttendanceSessionAction} className="grid gap-5 sm:grid-cols-2">
            {params.error ? (
              <p className="sm:col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {params.error === "time"
                  ? "Opening time must be before normal close, and normal close must be before final close."
                  : params.error === "lecturer-accuracy"
                    ? "The captured lecturer location accuracy is above the selected limit. Recapture closer to the class location or increase the limit."
                    : "Complete all required session fields and capture location."}
              </p>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="courseId">Course</Label>
              <Select name="courseId" required defaultValue={params.courseId}>
                <SelectTrigger id="courseId">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {lecturerCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.courseCode}: {course.courseTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                Students outside this distance from the captured lecture location are flagged or rejected.
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
                latitudeName="lecturerLatitude"
                longitudeName="lecturerLongitude"
                maxAccuracyInputId="maxAcceptedAccuracyMeters"
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
