import { eq } from "drizzle-orm";

import {
  deleteAssignedCourseAction,
  updateAssignedCourseAction,
} from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
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
import { getDb } from "@/db/client";
import { courses, lecturerProfiles, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function EditAssignedCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("administrator");
  const { courseId } = await params;
  const query = await searchParams;
  const db = getDb();
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  const lecturers = await db
    .select({
      id: lecturerProfiles.id,
      name: users.name,
      email: users.email,
    })
    .from(lecturerProfiles)
    .innerJoin(users, eq(lecturerProfiles.userId, users.id));

  if (!course) {
    return <PageHeader title="Assigned course not found" />;
  }

  return (
    <>
      <PageHeader
        title="Manage assignment"
        description={`${course.courseCode}: ${course.courseTitle}`}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="pt-6">
            <form action={updateAssignedCourseAction} className="grid gap-5 sm:grid-cols-2">
              <input name="courseId" type="hidden" value={course.id} />
              {query.error ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
                  Select a lecturer and complete the assignment details.
                </p>
              ) : null}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="lecturerId">Assigned lecturer</Label>
                <Select defaultValue={course.lecturerId} name="lecturerId" required>
                  <SelectTrigger id="lecturerId">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {lecturers.map((lecturer) => (
                      <SelectItem key={lecturer.id} value={lecturer.id}>
                        {lecturer.name} ({lecturer.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="semester">Semester</Label>
                <Input
                  defaultValue={course.semester}
                  id="semester"
                  name="semester"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="academicYear">Academic year</Label>
                <Input
                  defaultValue={course.academicYear}
                  id="academicYear"
                  name="academicYear"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classGroup">Class group</Label>
                <Input
                  defaultValue={course.classGroup}
                  id="classGroup"
                  name="classGroup"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue={course.status} name="status">
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Button className="w-full" type="submit">
                  Save assignment
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Remove assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Removing this assignment deletes the lecturer-course offering,
              including related enrolments, sessions, and resources.
            </p>
            <form action={deleteAssignedCourseAction}>
              <input name="courseId" type="hidden" value={course.id} />
              <ConfirmSubmitButton message="Delete this course assignment? This will remove related enrolments, sessions, and resources.">
                Delete assignment
              </ConfirmSubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
