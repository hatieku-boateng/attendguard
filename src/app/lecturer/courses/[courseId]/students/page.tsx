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
        <Card id="manual-student" className="glass-panel glass-panel-hover overflow-hidden relative border-border/40">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
          <CardHeader className="border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01] pb-4">
            <CardTitle className="text-base font-bold text-foreground">Add student manually</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Enrol one student and email a secure activation link. Programme,
              level, and class group default to this course when left blank.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {report.manualError ? (
              <p className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed">
                {report.manualError === "conflict"
                  ? "A matching student could not be enrolled. Check the email and student ID."
                  : "Enter the student's name, ID, and valid email address."}
              </p>
            ) : null}
            {report.manualAdded ? (
              <p className="mb-4 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs font-semibold text-primary leading-relaxed">
                Student added. Activation emails sent {report.sent ?? 0}; pending email setup{" "}
                {report.pendingEmail ?? 0}.
              </p>
            ) : null}
            <form action={addStudentManuallyAction} className="grid gap-4 sm:grid-cols-2">
              <input name="courseId" type="hidden" value={course.id} />
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Student name</Label>
                <Input id="name" name="name" required placeholder="e.g. John Doe" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="studentIdNumber" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Student ID</Label>
                <Input className="uppercase-input" id="studentIdNumber" name="studentIdNumber" required placeholder="e.g. PS/CS/12/0001" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email address</Label>
                <Input id="email" name="email" required type="email" placeholder="student@university.edu" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="programme" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Programme</Label>
                <Input
                  defaultValue={course.programme ?? ""}
                  id="programme"
                  name="programme"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="level" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Level</Label>
                <Input defaultValue={course.level ?? ""} id="level" name="level" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="classGroup" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Class group</Label>
                <Input
                  defaultValue={course.classGroup}
                  id="classGroup"
                  name="classGroup"
                />
              </div>
              <div className="sm:col-span-2 pt-2">
                <PendingSubmitButton className="w-full py-5 rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg text-sm" pendingLabel="Adding student...">
                  Add student and send activation
                </PendingSubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card id="import-students" className="glass-panel glass-panel-hover overflow-hidden relative border-border/40">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 to-indigo-500" />
          <CardHeader className="border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01] pb-4">
            <CardTitle className="text-base font-bold text-foreground">CSV import</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Upload a CSV with the required columns: student name, student ID, and
              valid email address. Programme, level, and class group are optional.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {report.importError === "headings" ? (
              <p className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed">
                The CSV headings are missing required columns.
              </p>
            ) : null}
            {report.imported ? (
              <p className="mb-4 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs font-semibold text-primary leading-relaxed">
                Imported {report.imported} row(s), skipped {report.skipped ?? 0},
                errors {report.errors ?? 0}. Activation emails sent{" "}
                {report.sent ?? 0}; pending email setup {report.pendingEmail ?? 0}.
              </p>
            ) : null}
            <form action={importStudentsAction} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <input name="courseId" type="hidden" value={course.id} />
              <div className="space-y-1.5">
                <Label htmlFor="studentFile" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Student CSV file</Label>
                <Input
                  accept=".csv,text/csv"
                  id="studentFile"
                  name="studentFile"
                  required
                  type="file"
                  className="h-10 text-xs bg-background/50 border-border/50 rounded-xl"
                />
              </div>
              <PendingSubmitButton pendingLabel="Importing..." className="h-10 rounded-xl font-bold shadow-md shadow-primary/20 text-xs px-5">Import</PendingSubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
      <Card className="glass-panel border-border/40 overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <CardHeader className="border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01] pb-4">
          <CardTitle className="text-base font-bold text-foreground">Class list</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            {students.filter((student) => student.status === "active").length} active of{" "}
            {students.length} student record(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 px-0">
          {report.removed ? (
            <div className="mx-6 mt-5">
              <p className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs font-semibold text-primary leading-relaxed">
                Student removed from this course.{" "}
                {report.removed === "withdrawn"
                  ? "Attendance history was preserved and the enrolment was marked withdrawn."
                  : "No attendance history existed, so the enrolment was deleted."}
              </p>
            </div>
          ) : null}
          {report.activation ? (
            <div className="mx-6 mt-5">
              <p className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs font-semibold text-primary leading-relaxed">
                {report.activation === "resent"
                  ? "Activation link resent successfully."
                  : report.activation === "already-active"
                    ? "That student account is already active."
                    : "Activation link could not be emailed. Check email configuration."}
              </p>
            </div>
          ) : null}
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-950/[0.02] dark:bg-white/[0.01]">
                <TableRow className="hover:bg-transparent border-b border-border/30">
                  <TableHead className="px-6 py-3 font-semibold text-muted-foreground text-xs">Name</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Student ID</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Email</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Programme</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Level</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Status</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Account</TableHead>
                  <TableHead className="px-6 py-3 text-right font-semibold text-muted-foreground text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.enrolmentId} className="hover:bg-muted/30 border-b border-border/20 transition-colors">
                    <TableCell className="px-6 py-4.5 font-extrabold text-foreground text-sm">{student.name}</TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-bold text-foreground/80">{student.studentIdNumber}</TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">{student.email}</TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-bold text-foreground/85">{student.programme || "-"}</TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-bold text-foreground/85">{student.level || "-"}</TableCell>
                    <TableCell className="px-4 py-4.5">
                      <StatusBadge status={student.status} />
                    </TableCell>
                    <TableCell className="px-4 py-4.5">
                      <StatusBadge status={student.activatedAt ? "active" : student.accountStatus} />
                    </TableCell>
                    <TableCell className="px-6 py-4.5 text-right">
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
                                className="h-8.5 rounded-lg text-xs font-bold shadow-sm"
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
                              className="w-auto h-8.5 rounded-lg text-xs font-bold shadow-sm"
                              message={`Remove ${student.name} from this course? Existing attendance history will be preserved.`}
                              size="sm"
                              variant="outline"
                            >
                              Remove
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground font-semibold">No active access</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-24 text-center text-muted-foreground text-xs font-semibold" colSpan={8}>
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
              <div key={student.enrolmentId} className="p-5 flex flex-col gap-3.5">
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
                          className="w-full h-8.5 rounded-lg text-xs font-bold"
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
                        className="w-full h-8.5 rounded-lg text-xs font-bold"
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
