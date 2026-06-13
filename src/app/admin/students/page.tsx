import Link from "next/link";
import { and, asc, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { Pencil, Search, Trash2, UsersRound } from "lucide-react";

import {
  bulkDeleteEnrolledStudentsAction,
  bulkUpdateEnrolledStudentsAction,
  deleteEnrolledStudentAction,
} from "@/app/admin/actions";
import { BulkSelectionToggle } from "@/components/bulk-selection-toggle";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDb } from "@/db/client";
import { courses, enrolments, studentProfiles, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";

const statuses = ["active", "withdrawn", "completed"] as const;

function normalizeStatus(value?: string) {
  return statuses.includes(value as (typeof statuses)[number])
    ? (value as (typeof statuses)[number])
    : "all";
}

function statusVariant(status: string) {
  if (status === "active") {
    return "default" as const;
  }

  if (status === "withdrawn") {
    return "destructive" as const;
  }

  return "secondary" as const;
}

function noticeFor(query: {
  updated?: string;
  deleted?: string;
  bulkUpdated?: string;
  bulkDeleted?: string;
  error?: string;
}) {
  if (query.updated) {
    return "Student enrolment updated.";
  }

  if (query.deleted) {
    return "Student enrolment removed.";
  }

  if (query.bulkUpdated) {
    return `${query.bulkUpdated} enrolment(s) updated.`;
  }

  if (query.bulkDeleted) {
    return `${query.bulkDeleted} enrolment(s) removed.`;
  }

  if (query.error === "bulk") {
    return "Select at least one enrolment and choose a valid bulk action.";
  }

  if (query.error) {
    return "The selected enrolment could not be found.";
  }

  return null;
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    courseId?: string;
    updated?: string;
    deleted?: string;
    bulkUpdated?: string;
    bulkDeleted?: string;
    error?: string;
  }>;
}) {
  await requireRole("administrator");
  const query = await searchParams;
  const searchTerm = (query.q ?? "").trim();
  const selectedStatus = normalizeStatus(query.status);
  const selectedCourseId = query.courseId ?? "all";
  const db = getDb();

  const filters: SQL[] = [];

  if (selectedStatus !== "all") {
    filters.push(eq(enrolments.status, selectedStatus));
  }

  if (selectedCourseId !== "all") {
    filters.push(eq(enrolments.courseId, selectedCourseId));
  }

  if (searchTerm) {
    const pattern = `%${searchTerm}%`;
    const searchFilter = or(
      ilike(users.name, pattern),
      ilike(users.email, pattern),
      ilike(studentProfiles.studentIdNumber, pattern),
      ilike(courses.courseCode, pattern),
      ilike(courses.courseTitle, pattern),
    );

    if (searchFilter) {
      filters.push(searchFilter);
    }
  }

  const [rows, courseOptions] = await Promise.all([
    db
      .select({
        enrolmentId: enrolments.id,
        status: enrolments.status,
        enrolledAt: enrolments.enrolledAt,
        studentName: users.name,
        studentEmail: users.email,
        studentIdNumber: studentProfiles.studentIdNumber,
        programme: studentProfiles.programme,
        level: studentProfiles.level,
        classGroup: studentProfiles.classGroup,
        courseId: courses.id,
        courseCode: courses.courseCode,
        courseTitle: courses.courseTitle,
        semester: courses.semester,
        academicYear: courses.academicYear,
      })
      .from(enrolments)
      .innerJoin(studentProfiles, eq(enrolments.studentId, studentProfiles.id))
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .innerJoin(courses, eq(enrolments.courseId, courses.id))
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(enrolments.createdAt)),
    db
      .select({
        id: courses.id,
        courseCode: courses.courseCode,
        courseTitle: courses.courseTitle,
        semester: courses.semester,
        academicYear: courses.academicYear,
        classGroup: courses.classGroup,
      })
      .from(courses)
      .orderBy(asc(courses.courseCode)),
  ]);

  const notice = noticeFor(query);
  const activeCount = rows.filter((row) => row.status === "active").length;
  const withdrawnCount = rows.filter((row) => row.status === "withdrawn").length;
  const completedCount = rows.filter((row) => row.status === "completed").length;

  return (
    <>
      <PageHeader
        title="Enrolled students"
        description="Review, correct, update, and remove student enrolments across every assigned course."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Visible records
              </p>
              <p className="mt-2 text-2xl font-semibold">{rows.length}</p>
            </div>
            <UsersRound className="size-8 text-primary" />
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Active
            </p>
            <p className="mt-2 text-2xl font-semibold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Closed status
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {withdrawnCount + completedCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardContent className="pt-6">
          <form className="grid gap-3 lg:grid-cols-[1fr_280px_190px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                defaultValue={searchTerm}
                name="q"
                placeholder="Search name, email, student ID, or course"
              />
            </div>
            <select
              className="h-9 rounded-lg border border-input bg-card/80 px-3 text-sm shadow-sm shadow-slate-950/5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/45"
              defaultValue={selectedCourseId}
              name="courseId"
            >
              <option value="all">All courses</option>
              {courseOptions.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.courseCode} - {course.classGroup}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-lg border border-input bg-card/80 px-3 text-sm shadow-sm shadow-slate-950/5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/45"
              defaultValue={selectedStatus}
              name="status"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="completed">Completed</option>
            </select>
            <div className="flex gap-2">
              <Button className="flex-1 lg:flex-none" type="submit">
                <Search className="size-4" />
                Filter
              </Button>
              {searchTerm || selectedStatus !== "all" || selectedCourseId !== "all" ? (
                <Button asChild className="flex-1 lg:flex-none" variant="outline">
                  <Link href="/admin/students">Reset</Link>
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Student register</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notice ? (
            <p
              className={`rounded-lg border px-3 py-2 text-sm ${
                query.error
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-primary/20 bg-primary/10 text-primary"
              }`}
            >
              {notice}
            </p>
          ) : null}

          <form
            className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/35 p-3 sm:flex-row sm:items-center sm:justify-between"
            id="admin-student-bulk-form"
          >
            <div className="text-sm text-muted-foreground">
              Select one or more records to update status or remove enrolments in bulk.
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                className="h-8 rounded-lg border border-input bg-card/80 px-3 text-sm shadow-sm shadow-slate-950/5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/45"
                defaultValue="active"
                name="bulkStatus"
              >
                <option value="active">Set active</option>
                <option value="withdrawn">Set withdrawn</option>
                <option value="completed">Set completed</option>
              </select>
              <Button formAction={bulkUpdateEnrolledStudentsAction} type="submit" variant="outline">
                Update selected
              </Button>
              <ConfirmSubmitButton
                className="sm:w-auto"
                formAction={bulkDeleteEnrolledStudentsAction}
                message="Remove all selected enrolments? Attendance history will be preserved, but the students will no longer belong to those courses."
              >
                <Trash2 className="size-4" />
                Remove selected
              </ConfirmSubmitButton>
            </div>
          </form>

          <Table className="min-w-[76rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <BulkSelectionToggle />
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Programme</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((student) => (
                <TableRow key={student.enrolmentId}>
                  <TableCell>
                    <input
                      aria-label={`Select ${student.studentName}`}
                      className="size-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      data-bulk-row
                      form="admin-student-bulk-form"
                      name="enrolmentId"
                      type="checkbox"
                      value={student.enrolmentId}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {student.studentName}
                    <span className="block text-xs text-muted-foreground">
                      {student.studentIdNumber} / {student.studentEmail}
                    </span>
                  </TableCell>
                  <TableCell>
                    {student.courseCode}
                    <span className="block max-w-[18rem] truncate text-xs text-muted-foreground">
                      {student.courseTitle}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {student.semester} / {student.academicYear}
                    </span>
                  </TableCell>
                  <TableCell>{student.programme ?? "-"}</TableCell>
                  <TableCell>{student.level ?? "-"}</TableCell>
                  <TableCell>{student.classGroup ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(student.status)}>
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {student.enrolledAt.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/students/${student.enrolmentId}/edit`}>
                          <Pencil className="size-4" />
                          Edit
                        </Link>
                      </Button>
                      <form action={deleteEnrolledStudentAction}>
                        <input name="enrolmentId" type="hidden" value={student.enrolmentId} />
                        <ConfirmSubmitButton
                          className="w-auto"
                          message={`Remove ${student.studentName} from ${student.courseCode}? Attendance history will be preserved.`}
                          size="sm"
                        >
                          <Trash2 className="size-4" />
                          Remove
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell className="h-28 text-center text-muted-foreground" colSpan={9}>
                    No enrolled students match the current filters.
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
