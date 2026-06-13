import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft, Trash2 } from "lucide-react";

import {
  deleteEnrolledStudentAction,
  updateEnrolledStudentAction,
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
import { courses, enrolments, studentProfiles, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";

function errorMessage(error?: string) {
  if (error === "email") {
    return "That email address already belongs to another account.";
  }

  if (error === "studentId") {
    return "That student ID already belongs to another student profile.";
  }

  if (error === "duplicate") {
    return "This student is already enrolled in the selected course.";
  }

  if (error === "course") {
    return "Select a valid course assignment.";
  }

  if (error === "courseHistory") {
    return "This enrolment has attendance history, so its course cannot be changed. Remove it and enrol the student again if a correction is required.";
  }

  if (error) {
    return "Complete all required fields before saving.";
  }

  return null;
}

export default async function EditEnrolledStudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ enrolmentId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("administrator");
  const { enrolmentId } = await params;
  const query = await searchParams;
  const db = getDb();
  const [target] = await db
    .select({
      enrolmentId: enrolments.id,
      courseId: enrolments.courseId,
      enrolmentStatus: enrolments.status,
      studentName: users.name,
      studentEmail: users.email,
      studentIdNumber: studentProfiles.studentIdNumber,
      programme: studentProfiles.programme,
      level: studentProfiles.level,
      classGroup: studentProfiles.classGroup,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
    })
    .from(enrolments)
    .innerJoin(studentProfiles, eq(enrolments.studentId, studentProfiles.id))
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .innerJoin(courses, eq(enrolments.courseId, courses.id))
    .where(eq(enrolments.id, enrolmentId))
    .limit(1);

  const courseOptions = await db
    .select({
      id: courses.id,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
      semester: courses.semester,
      academicYear: courses.academicYear,
      classGroup: courses.classGroup,
      status: courses.status,
    })
    .from(courses)
    .orderBy(asc(courses.courseCode));

  if (!target) {
    return (
      <>
        <PageHeader
          title="Enrolled student not found"
          description="The selected enrolment may already have been removed."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/students">
                <ArrowLeft className="size-4" />
                Back to students
              </Link>
            </Button>
          }
        />
      </>
    );
  }

  const message = errorMessage(query.error);

  return (
    <>
      <PageHeader
        title="Manage enrolled student"
        description={`${target.studentName} / ${target.courseCode}: ${target.courseTitle}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/students">
              <ArrowLeft className="size-4" />
              Back to students
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="pt-6">
            <form action={updateEnrolledStudentAction} className="grid gap-5 sm:grid-cols-2">
              <input name="enrolmentId" type="hidden" value={target.enrolmentId} />
              {message ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
                  {message}
                </p>
              ) : null}

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="courseId">Course enrolment</Label>
                <Select defaultValue={target.courseId} name="courseId" required>
                  <SelectTrigger className="w-full" id="courseId">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {courseOptions.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.courseCode}: {course.courseTitle} / {course.classGroup} /{" "}
                        {course.semester} {course.academicYear}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-muted-foreground">
                  Course changes are blocked once attendance records exist for this enrolment.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Student name</Label>
                <Input defaultValue={target.studentName} id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  defaultValue={target.studentEmail}
                  id="email"
                  name="email"
                  required
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentIdNumber">Student ID</Label>
                <Input
                  defaultValue={target.studentIdNumber}
                  id="studentIdNumber"
                  name="studentIdNumber"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Enrolment status</Label>
                <Select defaultValue={target.enrolmentStatus} name="status">
                  <SelectTrigger className="w-full" id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="programme">Programme</Label>
                <Input
                  defaultValue={target.programme ?? ""}
                  id="programme"
                  name="programme"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <Input defaultValue={target.level ?? ""} id="level" name="level" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="classGroup">Student class group</Label>
                <Input
                  defaultValue={target.classGroup ?? ""}
                  id="classGroup"
                  name="classGroup"
                />
              </div>
              <p className="rounded-lg border border-border/70 bg-muted/35 px-3 py-2 text-sm text-muted-foreground sm:col-span-2">
                Identity and profile changes apply to this student across every course
                enrolment.
              </p>
              <div className="sm:col-span-2">
                <Button className="w-full" type="submit">
                  Save enrolled student
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Remove enrolment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Removing this enrolment takes the student out of this course. Existing
              attendance records remain preserved for audit and reporting.
            </p>
            <form action={deleteEnrolledStudentAction}>
              <input name="enrolmentId" type="hidden" value={target.enrolmentId} />
              <ConfirmSubmitButton message="Remove this student enrolment? Attendance history will be preserved, but the student will no longer belong to this course.">
                <Trash2 className="size-4" />
                Remove enrolment
              </ConfirmSubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
