import Link from "next/link";
import { and, count, eq } from "drizzle-orm";

import {
  addCourseResourceAction,
  deleteCourseResourceAction,
  updateCourseStatusAction,
} from "@/app/lecturer/courses/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
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
import { getDb } from "@/db/client";
import {
  attendanceSessions,
  courseResources,
  courses,
  enrolments,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
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
              <Link href={`/lecturer/sessions/new?courseId=${course.id}`}>
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
            <Badge variant="secondary">{course.status}</Badge>
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
    </>
  );
}
