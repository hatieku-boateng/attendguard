import { and, eq } from "drizzle-orm";

import {
  addStudentManuallyAction,
  importStudentsAction,
  removeStudentFromCourseAction,
  resendStudentActivationAction,
} from "@/app/lecturer/courses/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/db/client";
import { courses, enrolments, studentProfiles, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function CourseStudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{
    imported?: string;
    skipped?: string;
    errors?: string;
    sent?: string;
    pendingEmail?: string;
    importError?: string;
    manualAdded?: string;
    manualError?: string;
    removed?: string;
    activation?: string;
  }>;
}) {
  const { courseId } = await params;
  const report = await searchParams;
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

  const students = await db
    .select({
      enrolmentId: enrolments.id,
      status: enrolments.status,
      userId: users.id,
      accountStatus: users.status,
      activatedAt: users.emailVerifiedAt,
      name: users.name,
      email: users.email,
      studentIdNumber: studentProfiles.studentIdNumber,
      programme: studentProfiles.programme,
      level: studentProfiles.level,
      classGroup: studentProfiles.classGroup,
    })
    .from(enrolments)
    .innerJoin(studentProfiles, eq(enrolments.studentId, studentProfiles.id))
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(eq(enrolments.courseId, course.id));

  return (
    <>
      <PageHeader
        title={`${course.courseCode} students`}
        description="Registered students enrolled in this class."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href="#manual-student">Add manually</a>
            </Button>
            <Button asChild>
              <a href="#import-students">Import students</a>
            </Button>
          </div>
        }
      />
      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card id="manual-student">
          <CardHeader>
            <CardTitle>Add student manually</CardTitle>
            <CardDescription>
              Enrol one student and email a secure activation link. Programme,
              level, and class group default to this course when left blank.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {report.manualError ? (
              <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {report.manualError === "conflict"
                  ? "A matching student could not be enrolled. Check the email and student ID."
                  : "Enter the student's name, ID, and valid email address."}
              </p>
            ) : null}
            {report.manualAdded ? (
              <p className="mb-4 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                Student added. Activation emails sent {report.sent ?? 0}; pending email setup{" "}
                {report.pendingEmail ?? 0}.
              </p>
            ) : null}
            <form action={addStudentManuallyAction} className="grid gap-4 sm:grid-cols-2">
              <input name="courseId" type="hidden" value={course.id} />
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Student name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentIdNumber">Student ID</Label>
                <Input className="uppercase-input" id="studentIdNumber" name="studentIdNumber" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" name="email" required type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="programme">Programme</Label>
                <Input
                  defaultValue={course.programme ?? ""}
                  id="programme"
                  name="programme"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <Input defaultValue={course.level ?? ""} id="level" name="level" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="classGroup">Class group</Label>
                <Input
                  defaultValue={course.classGroup}
                  id="classGroup"
                  name="classGroup"
                />
              </div>
              <div className="sm:col-span-2">
                <PendingSubmitButton className="w-full" pendingLabel="Adding student...">
                  Add student and send activation
                </PendingSubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card id="import-students">
          <CardHeader>
            <CardTitle>CSV import</CardTitle>
            <CardDescription>
              Upload a CSV with the required columns: student name, student ID, and
              valid email address. Programme, level, and class group are optional
              and default to this course when omitted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {report.importError === "headings" ? (
              <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                The CSV headings are missing required columns.
              </p>
            ) : null}
            {report.imported ? (
              <p className="mb-4 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                Imported {report.imported} row(s), skipped {report.skipped ?? 0},
                errors {report.errors ?? 0}. Activation emails sent{" "}
                {report.sent ?? 0}; pending email setup {report.pendingEmail ?? 0}.
              </p>
            ) : null}
            <form action={importStudentsAction} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <input name="courseId" type="hidden" value={course.id} />
              <div className="space-y-2">
                <Label htmlFor="studentFile">Student CSV file</Label>
                <Input
                  accept=".csv,text/csv"
                  id="studentFile"
                  name="studentFile"
                  required
                  type="file"
                />
              </div>
              <PendingSubmitButton pendingLabel="Importing...">Import</PendingSubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Class list</CardTitle>
          <CardDescription>
            {students.filter((student) => student.status === "active").length} active of{" "}
            {students.length} student record(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.removed ? (
            <p className="mb-4 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
              Student removed from this course.{" "}
              {report.removed === "withdrawn"
                ? "Attendance history was preserved and the enrolment was marked withdrawn."
                : "No attendance history existed, so the enrolment was deleted."}
            </p>
          ) : null}
          {report.activation ? (
            <p className="mb-4 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
              {report.activation === "resent"
                ? "Activation link resent successfully."
                : report.activation === "already-active"
                  ? "That student account is already active."
                  : "Activation link could not be emailed. Check email configuration."}
            </p>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Programme</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.enrolmentId}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.studentIdNumber}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.programme || "-"}</TableCell>
                  <TableCell>{student.level || "-"}</TableCell>
                  <TableCell>
                    <StatusBadge status={student.status} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={student.activatedAt ? "active" : student.accountStatus} />
                  </TableCell>
                  <TableCell className="text-right">
                    {student.status === "active" ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        {student.accountStatus !== "active" ? (
                          <form action={resendStudentActivationAction}>
                            <input name="courseId" type="hidden" value={course.id} />
                            <input name="studentUserId" type="hidden" value={student.userId} />
                            <PendingSubmitButton
                              pendingLabel="Sending..."
                              size="sm"
                              variant="outline"
                            >
                              Resend activation
                            </PendingSubmitButton>
                          </form>
                        ) : null}
                        <form action={removeStudentFromCourseAction}>
                          <input name="courseId" type="hidden" value={course.id} />
                          <input
                            name="enrolmentId"
                            type="hidden"
                            value={student.enrolmentId}
                          />
                          <ConfirmSubmitButton
                            className="w-auto"
                            message={`Remove ${student.name} from this course? Existing attendance history will be preserved.`}
                            size="sm"
                            variant="outline"
                          >
                            Remove
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No active access</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {students.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={8}>
                    No students have been enrolled yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
