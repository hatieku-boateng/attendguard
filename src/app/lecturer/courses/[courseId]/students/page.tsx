import { and, eq } from "drizzle-orm";

import { importStudentsAction } from "@/app/lecturer/courses/actions";
import { PageHeader } from "@/components/page-header";
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
          <Button asChild>
            <a href="#import-students">Import students</a>
          </Button>
        }
      />
      <Card id="import-students" className="mb-6">
        <CardHeader>
          <CardTitle>CSV import</CardTitle>
          <CardDescription>
            Upload a CSV with the required columns: student name, student ID, and
            valid email address. Pending students receive a secure one-time
            activation link by email and must confirm their student ID.
            Optional columns: programme, level, class group.
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
            <Button type="submit">Import</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Class list</CardTitle>
          <CardDescription>{students.length} enrolled student(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Programme</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Status</TableHead>
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
                  <TableCell>{student.status}</TableCell>
                </TableRow>
              ))}
              {students.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={6}>
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
