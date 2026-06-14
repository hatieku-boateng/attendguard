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
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
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
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border/20">
            {students.map((student) => (
              <div key={student.enrolmentId} className="py-4.5 flex flex-col gap-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-extrabold text-foreground leading-snug">{student.name}</span>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                      {student.studentIdNumber} <span className="text-muted-foreground/35 mx-1">/</span> {student.email}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-wider">Enrol:</span>
                      <StatusBadge status={student.status} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-wider">Acct:</span>
                      <StatusBadge status={student.activatedAt ? "active" : student.accountStatus} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-950/[0.015] dark:bg-white/[0.015] p-3 rounded-xl border border-border/25">
                  <div>
                    <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Programme</span>
                    <span className="font-bold text-foreground/80 mt-0.5 block truncate">{student.programme || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Level</span>
                    <span className="font-bold text-foreground/80 mt-0.5 block truncate">{student.level || "-"}</span>
                  </div>
                </div>

                {student.status === "active" ? (
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    {student.accountStatus !== "active" ? (
                      <form action={resendStudentActivationAction} className="flex-1">
                        <input name="courseId" type="hidden" value={course.id} />
                        <input name="studentUserId" type="hidden" value={student.userId} />
                        <PendingSubmitButton
                          pendingLabel="Sending..."
                          size="sm"
                          variant="outline"
                          className="w-full text-xs font-bold"
                        >
                          Resend activation
                        </PendingSubmitButton>
                      </form>
                    ) : null}
                    <form action={removeStudentFromCourseAction} className="flex-1">
                      <input name="courseId" type="hidden" value={course.id} />
                      <input
                        name="enrolmentId"
                        type="hidden"
                        value={student.enrolmentId}
                      />
                      <ConfirmSubmitButton
                        className="w-full h-8.5 text-xs font-bold"
                        message={`Remove ${student.name} from this course? Existing attendance history will be preserved.`}
                        size="sm"
                        variant="outline"
                      >
                        Remove Student
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                ) : (
                  <div className="text-center py-1 bg-muted/30 border border-dashed border-border/40 rounded-lg">
                    <span className="text-xs text-muted-foreground font-semibold">No active access</span>
                  </div>
                )}
              </div>
            ))}
            {students.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 px-6">
                <p className="text-center text-muted-foreground text-sm font-semibold">No students enrolled yet.</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
