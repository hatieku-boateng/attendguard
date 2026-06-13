import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Pencil, Search, Trash2, UserCheck, UsersRound } from "lucide-react";

import {
  bulkDeleteStudentAccountsAction,
  deleteStudentAccountAction,
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

const accountStatuses = ["pending", "active", "suspended", "disabled"] as const;

function normalizeAccountStatus(value?: string) {
  return accountStatuses.includes(value as (typeof accountStatuses)[number])
    ? (value as (typeof accountStatuses)[number])
    : "all";
}

function accountStatusVariant(status: string) {
  if (status === "active") {
    return "default" as const;
  }

  if (status === "pending") {
    return "secondary" as const;
  }

  return "destructive" as const;
}

function noticeFor(query: {
  accountUpdated?: string;
  accountDeleted?: string;
  bulkAccountsDeleted?: string;
  error?: string;
}) {
  if (query.accountUpdated) {
    return "Student account updated.";
  }

  if (query.accountDeleted) {
    return "Student account deleted.";
  }

  if (query.bulkAccountsDeleted) {
    return `${query.bulkAccountsDeleted} student account(s) deleted.`;
  }

  if (query.error === "bulkStudents") {
    return "Select at least one student account before using a bulk action.";
  }

  if (query.error) {
    return "The selected student account could not be found.";
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
    accountUpdated?: string;
    accountDeleted?: string;
    bulkAccountsDeleted?: string;
    error?: string;
  }>;
}) {
  await requireRole("administrator");
  const query = await searchParams;
  const searchTerm = (query.q ?? "").trim();
  const normalizedSearchTerm = searchTerm.toLowerCase();
  const selectedStatus = normalizeAccountStatus(query.status);
  const selectedCourseId = query.courseId ?? "all";
  const db = getDb();

  const [students, studentEnrolments, courseOptions] = await Promise.all([
    db
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
      .orderBy(asc(users.name)),
    db
      .select({
        enrolmentId: enrolments.id,
        studentId: enrolments.studentId,
        status: enrolments.status,
        courseId: courses.id,
        courseCode: courses.courseCode,
        courseTitle: courses.courseTitle,
        semester: courses.semester,
        academicYear: courses.academicYear,
        classGroup: courses.classGroup,
      })
      .from(enrolments)
      .innerJoin(courses, eq(enrolments.courseId, courses.id)),
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

  const enrolmentsByStudent = new Map<string, typeof studentEnrolments>();

  for (const enrolment of studentEnrolments) {
    const current = enrolmentsByStudent.get(enrolment.studentId) ?? [];
    current.push(enrolment);
    enrolmentsByStudent.set(enrolment.studentId, current);
  }

  const rows = students
    .map((student) => ({
      ...student,
      enrolments: enrolmentsByStudent.get(student.studentId) ?? [],
    }))
    .filter((student) => {
      if (selectedStatus !== "all" && student.accountStatus !== selectedStatus) {
        return false;
      }

      if (
        selectedCourseId !== "all" &&
        !student.enrolments.some((enrolment) => enrolment.courseId === selectedCourseId)
      ) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      const searchable = [
        student.studentName,
        student.studentEmail,
        student.studentIdNumber,
        student.programme ?? "",
        student.level ?? "",
        student.classGroup ?? "",
        ...student.enrolments.flatMap((enrolment) => [
          enrolment.courseCode,
          enrolment.courseTitle,
        ]),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearchTerm);
    });

  const notice = noticeFor(query);
  const activeCount = rows.filter((row) => row.accountStatus === "active").length;
  const pendingCount = rows.filter((row) => row.accountStatus === "pending").length;
  const assignedCount = rows.filter((row) => row.enrolments.length > 0).length;

  return (
    <>
      <PageHeader
        title="Students"
        description="Supervise every student account in the system, including students who have not yet been assigned to any course."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Visible students
              </p>
              <p className="mt-2 text-2xl font-semibold">{rows.length}</p>
            </div>
            <UsersRound className="size-8 text-primary" />
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Active accounts
              </p>
              <p className="mt-2 text-2xl font-semibold">{activeCount}</p>
            </div>
            <UserCheck className="size-8 text-primary" />
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Assigned / pending
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {assignedCount} / {pendingCount}
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
                placeholder="Search name, email, student ID, programme, or course"
              />
            </div>
            <select
              className="h-9 rounded-lg border border-input bg-card/80 px-3 text-sm shadow-sm shadow-slate-950/5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/45"
              defaultValue={selectedCourseId}
              name="courseId"
            >
              <option value="all">All course assignments</option>
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
              <option value="all">All account statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="disabled">Disabled</option>
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
          <CardTitle>Student account register</CardTitle>
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
            className="flex flex-col gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 sm:flex-row sm:items-center sm:justify-between"
            id="admin-student-bulk-form"
          >
            <div className="text-sm text-muted-foreground">
              Select student accounts to delete in bulk. This removes their accounts,
              profiles, enrolments, attendance records, activation tokens, and passkeys.
            </div>
            <ConfirmSubmitButton
              className="sm:w-auto"
              formAction={bulkDeleteStudentAccountsAction}
              message="Delete all selected student accounts? This removes their profiles, course enrolments, attendance records, activation tokens, and passkeys."
            >
              <Trash2 className="size-4" />
              Delete selected
            </ConfirmSubmitButton>
          </form>

          <Table className="min-w-[76rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <BulkSelectionToggle />
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Course assignments</TableHead>
                <TableHead>Programme</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((student) => (
                <TableRow key={student.studentId}>
                  <TableCell>
                    <input
                      aria-label={`Select ${student.studentName}`}
                      className="size-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      data-bulk-row
                      form="admin-student-bulk-form"
                      name="studentId"
                      type="checkbox"
                      value={student.studentId}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {student.studentName}
                    <span className="block text-xs text-muted-foreground">
                      {student.studentIdNumber} / {student.studentEmail}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={accountStatusVariant(student.accountStatus)}>
                      {student.accountStatus}
                    </Badge>
                    <span className="block text-xs text-muted-foreground">
                      {student.activatedAt ? "Activated" : "Not activated"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {student.enrolments.length > 0 ? (
                      <div className="max-w-[22rem] space-y-1">
                        {student.enrolments.slice(0, 2).map((enrolment) => (
                          <div key={enrolment.enrolmentId}>
                            <span className="font-medium">{enrolment.courseCode}</span>
                            <span className="text-xs text-muted-foreground">
                              {" "}
                              / {enrolment.status} / {enrolment.classGroup}
                            </span>
                          </div>
                        ))}
                        {student.enrolments.length > 2 ? (
                          <p className="text-xs text-muted-foreground">
                            +{student.enrolments.length - 2} more assignment(s)
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <Badge variant="outline">Unassigned</Badge>
                    )}
                  </TableCell>
                  <TableCell>{student.programme ?? "-"}</TableCell>
                  <TableCell>{student.level ?? "-"}</TableCell>
                  <TableCell>{student.classGroup ?? "-"}</TableCell>
                  <TableCell>
                    {student.createdAt.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/students/${student.studentId}/edit`}>
                          <Pencil className="size-4" />
                          Edit
                        </Link>
                      </Button>
                      <form action={deleteStudentAccountAction}>
                        <input name="studentId" type="hidden" value={student.studentId} />
                        <ConfirmSubmitButton
                          className="w-auto"
                          message={`Delete ${student.studentName}'s student account? This removes their profile, course enrolments, attendance records, activation tokens, and passkeys.`}
                          size="sm"
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell className="h-28 text-center text-muted-foreground" colSpan={9}>
                    No student accounts match the current filters.
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
