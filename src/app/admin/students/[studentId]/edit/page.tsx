import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft, Trash2 } from "lucide-react";

import {
  deleteStudentAccountAction,
  updateStudentAccountAction,
} from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
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
import { getDb } from "@/db/client";
import { attendanceRecords, courses, enrolments, studentProfiles, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";

function errorMessage(error?: string) {
  if (error === "email") {
    return "That email address already belongs to another account.";
  }

  if (error === "studentId") {
    return "That student ID already belongs to another student profile.";
  }

  if (error) {
    return "Complete all required fields before saving.";
  }

  return null;
}

export default async function EditStudentAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("administrator");
  const { studentId } = await params;
  const query = await searchParams;
  const db = getDb();
  const [target] = await db
    .select({
      studentId: studentProfiles.id,
      userId: users.id,
      studentName: users.name,
      studentEmail: users.email,
      accountStatus: users.status,
      activatedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
      studentIdNumber: studentProfiles.studentIdNumber,
      programme: studentProfiles.programme,
      level: studentProfiles.level,
      classGroup: studentProfiles.classGroup,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(eq(studentProfiles.id, studentId))
    .limit(1);

  if (!target) {
    return (
      <PageHeader
        title="Student account not found"
        description="The selected student may already have been deleted."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/students">
              <ArrowLeft className="size-4" />
              Back to students
            </Link>
          </Button>
        }
      />
    );
  }

  const [studentEnrolments, attendanceRows] = await Promise.all([
    db
      .select({
        enrolmentId: enrolments.id,
        status: enrolments.status,
        courseCode: courses.courseCode,
        courseTitle: courses.courseTitle,
        semester: courses.semester,
        academicYear: courses.academicYear,
        classGroup: courses.classGroup,
      })
      .from(enrolments)
      .innerJoin(courses, eq(enrolments.courseId, courses.id))
      .where(eq(enrolments.studentId, target.studentId)),
    db
      .select({ id: attendanceRecords.id })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.studentId, target.studentId)),
  ]);
  const message = errorMessage(query.error);

  return (
    <>
      <PageHeader
        title="Manage student account"
        description={`${target.studentName} / ${target.studentIdNumber}`}
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
            <form action={updateStudentAccountAction} className="grid gap-5 sm:grid-cols-2">
              <input name="studentId" type="hidden" value={target.studentId} />
              {message ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
                  {message}
                </p>
              ) : null}

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
                <Label htmlFor="status">Account status</Label>
                <Select defaultValue={target.accountStatus} name="status">
                  <SelectTrigger className="w-full" id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
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
              <div className="rounded-lg border border-border/70 bg-muted/35 px-3 py-2 text-sm text-muted-foreground sm:col-span-2">
                <p>
                  This edits the student account and profile globally, whether or not the
                  student has course assignments.
                </p>
              </div>
              <div className="sm:col-span-2">
                <Button className="w-full" type="submit">
                  Save student account
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Status</span>
                <Badge>{target.accountStatus}</Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Activation</span>
                <span>{target.activatedAt ? "Activated" : "Not activated"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Courses</span>
                <span>{studentEnrolments.length}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Attendance records</span>
                <span>{attendanceRows.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Course assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {studentEnrolments.length > 0 ? (
                studentEnrolments.map((enrolment) => (
                  <div
                    className="rounded-lg border border-border/70 bg-muted/30 p-3"
                    key={enrolment.enrolmentId}
                  >
                    <p className="font-medium">
                      {enrolment.courseCode}: {enrolment.courseTitle}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {enrolment.status} / {enrolment.classGroup} / {enrolment.semester}{" "}
                      {enrolment.academicYear}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">
                  This student is not currently assigned to any course.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delete student account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                This removes the student account, profile, course enrolments, attendance
                records, activation tokens, and passkeys.
              </p>
              <form action={deleteStudentAccountAction}>
                <input name="studentId" type="hidden" value={target.studentId} />
                <ConfirmSubmitButton message="Delete this student account? This removes the profile, course enrolments, attendance records, activation tokens, and passkeys.">
                  <Trash2 className="size-4" />
                  Delete student account
                </ConfirmSubmitButton>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
