import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";

import {
  addCourseResourceAction,
  deleteCourseResourceAction,
  updateCourseStatusAction,
} from "@/app/lecturer/courses/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  attendanceSessions,
  courseResources,
  courses,
  enrolments,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { FormModal } from "@/components/form-modal";
import { LocationFields } from "@/components/location-fields";
import { createAttendanceSessionAction } from "@/app/lecturer/sessions/actions";

export default async function CourseDetailPage({
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

  const [studentCount] = await db
    .select({ value: count() })
    .from(enrolments)
    .where(eq(enrolments.courseId, course.id));

  const [sessionCount] = await db
    .select({ value: count() })
    .from(attendanceSessions)
    .where(eq(attendanceSessions.courseId, course.id));
  const resources = await db
    .select()
    .from(courseResources)
    .where(eq(courseResources.courseId, course.id));
  const sessions = await db
    .select({
      id: attendanceSessions.id,
      title: attendanceSessions.sessionTitle,
      status: attendanceSessions.status,
      opensAt: attendanceSessions.opensAt,
      finalClosesAt: attendanceSessions.finalClosesAt,
    })
    .from(attendanceSessions)
    .where(eq(attendanceSessions.courseId, course.id))
    .orderBy(desc(attendanceSessions.opensAt));

  return (
    <>
      <PageHeader
        title={`${course.courseCode}: ${course.courseTitle}`}
        description={`${course.academicYear} / ${course.semester} / ${course.classGroup}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/lecturer/courses/${course.id}/students`}>Students</Link>
            </Button>
            <Button asChild>
              <Link href={`/lecturer/courses/${course.id}?modal=new`}>
                Start session
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Students enrolled" value={studentCount.value} />
        <StatCard label="Attendance sessions" value={sessionCount.value} />
        <StatCard label="Status" value={course.status} />
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Course details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Programme:</span>{" "}
            {course.programme || "Not set"}
          </p>
          <p>
            <span className="text-muted-foreground">Level:</span>{" "}
            {course.level || "Not set"}
          </p>
          <p>
            <span className="text-muted-foreground">Class group:</span>{" "}
            {course.classGroup}
          </p>
          <p>
            <span className="text-muted-foreground">Current status:</span>{" "}
            <StatusBadge status={course.status} />
          </p>
          <form action={updateCourseStatusAction} className="flex gap-2 sm:col-span-2">
            <input name="courseId" type="hidden" value={course.id} />
            <Button name="status" type="submit" value="active" variant="outline">
              Mark active
            </Button>
            <Button name="status" type="submit" value="archived" variant="outline">
              Archive
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="mt-6" id="sessions">
        <CardHeader>
          <CardTitle>Attendance sessions</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <TableCell className="font-medium">
                    <Link
                      className="text-primary underline-offset-4 hover:underline"
                      href={`/lecturer/courses/${course.id}/sessions/${session.id}`}
                    >
                      {session.title}
                    </Link>
                  </TableCell>
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
      <Card className="mt-6" id="resources">
        <CardHeader>
          <CardTitle>Course resources</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {resources.map((resource) => (
              <div className="rounded-lg border p-4" key={resource.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium">{resource.title}</p>
                    <p className="text-xs uppercase tracking-normal text-muted-foreground">
                      {resource.resourceType}
                    </p>
                    {resource.description ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {resource.description}
                      </p>
                    ) : null}
                    <a
                      className="mt-2 block text-sm font-medium text-primary"
                      href={resource.resourceUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open resource
                    </a>
                  </div>
                  <form action={deleteCourseResourceAction}>
                    <input name="courseId" type="hidden" value={course.id} />
                    <input name="resourceId" type="hidden" value={resource.id} />
                    <ConfirmSubmitButton
                      message="Delete this course resource?"
                      variant="outline"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>
            ))}
            {resources.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No course resources have been added yet.
              </div>
            ) : null}
          </div>
          <form action={addCourseResourceAction} className="grid gap-4 rounded-lg border p-4">
            <input name="courseId" type="hidden" value={course.id} />
            <div className="space-y-2">
              <Label htmlFor="title">Resource title</Label>
              <Input id="title" name="title" placeholder="Course outline" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resourceType">Type</Label>
              <Select defaultValue="outline" name="resourceType">
                <SelectTrigger id="resourceType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="slides">Slides</SelectItem>
                  <SelectItem value="reading">Reading</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resourceUrl">Resource URL</Label>
              <Input
                id="resourceUrl"
                name="resourceUrl"
                placeholder="https://..."
                required
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>
            <Button type="submit">Add resource</Button>
          </form>
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
            <LocationFields
              accuracyName="lecturerLocationAccuracy"
              allowManualEntry
              latitudeName="lecturerLatitude"
              longitudeName="lecturerLongitude"
              maxAccuracyInputId="maxAcceptedAccuracyMeters"
              requireAcceptance
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
