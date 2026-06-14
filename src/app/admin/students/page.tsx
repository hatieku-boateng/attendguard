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
import { StatusBadge } from "@/components/status-badge";
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
import {
  academicYears,
  courses,
  departments,
  enrolments,
  faculties,
  studentProfiles,
  users,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { programmeLevelLabel, studentCategoryLabel } from "@/lib/institution";

const accountStatuses = ["pending", "active", "suspended", "disabled"] as const;

function normalizeAccountStatus(value?: string) {
  return accountStatuses.includes(value as (typeof accountStatuses)[number])
    ? (value as (typeof accountStatuses)[number])
    : "all";
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
        studentCategory: studentProfiles.studentCategory,
        programmeLevel: studentProfiles.programmeLevel,
        programme: studentProfiles.programme,
        level: studentProfiles.level,
        classGroup: studentProfiles.classGroup,
        facultyName: faculties.name,
        departmentName: departments.name,
        academicYear: academicYears.displayName,
      })
      .from(studentProfiles)
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .leftJoin(faculties, eq(studentProfiles.facultyId, faculties.id))
      .leftJoin(departments, eq(studentProfiles.departmentId, departments.id))
      .leftJoin(academicYears, eq(studentProfiles.academicYearId, academicYears.id))
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
        studentCategoryLabel(student.studentCategory),
        programmeLevelLabel(student.programmeLevel),
        student.facultyName ?? "",
        student.departmentName ?? "",
        student.academicYear ?? "",
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
        title="Student Registry"
        description="Supervise every registered student account, configure course enrolments, and track activation states."
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <Card className="glass-panel glass-panel-hover border-border/40 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-cyan-500" />
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Visible Students
              </p>
              <p className="mt-2.5 text-3xl font-extrabold text-foreground font-mono">{rows.length}</p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/15">
              <UsersRound className="size-5.5" />
            </span>
          </CardContent>
        </Card>
        <Card className="glass-panel glass-panel-hover border-border/40 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Active Accounts
              </p>
              <p className="mt-2.5 text-3xl font-extrabold text-foreground font-mono">{activeCount}</p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/15">
              <UserCheck className="size-5.5" />
            </span>
          </CardContent>
        </Card>
        <Card className="glass-panel glass-panel-hover border-border/40 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Assigned / Pending
            </p>
            <p className="mt-2.5 text-3xl font-extrabold text-foreground font-mono">
              {assignedCount} <span className="text-muted-foreground/45 text-xl">/</span> {pendingCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 glass-panel border-border/40 overflow-hidden relative">
        <CardContent className="p-4 sm:p-5">
          <form className="grid gap-4 lg:grid-cols-[1fr_280px_200px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                className="pl-10 h-10.5 rounded-xl border-border/50 bg-background/50 focus-visible:ring-primary/20"
                defaultValue={searchTerm}
                name="q"
                placeholder="Search name, email, student ID, programme, or course"
              />
            </div>
            <select
              className="h-10.5 rounded-xl border border-border/50 bg-background/50 px-3 text-sm shadow-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/15 transition-all text-foreground"
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
              className="h-10.5 rounded-xl border border-border/50 bg-background/50 px-3 text-sm shadow-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/15 transition-all text-foreground"
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
              <Button className="flex-1 lg:flex-none h-10.5 rounded-xl px-5 font-bold shadow-sm" type="submit">
                <Search className="size-4" />
                <span>Filter</span>
              </Button>
              {searchTerm || selectedStatus !== "all" || selectedCourseId !== "all" ? (
                <Button asChild className="flex-1 lg:flex-none h-10.5 rounded-xl font-bold shadow-sm" variant="outline">
                  <Link href="/admin/students">Reset</Link>
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6 glass-panel border-border/40 overflow-hidden relative">
        <CardHeader className="border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01] pb-4">
          <CardTitle className="text-base font-bold text-foreground">Student Account Register</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-5 px-0">
          {notice ? (
            <div className="mx-6">
              <p
                className={`rounded-xl border px-4 py-3 text-xs font-bold leading-relaxed ${
                  query.error
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-primary/20 bg-primary/10 text-primary"
                }`}
              >
                {notice}
              </p>
            </div>
          ) : null}

          <div className="mx-6">
            <form
              className="flex flex-col gap-3.5 rounded-xl border border-rose-500/25 bg-rose-500/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              id="admin-student-bulk-form"
            >
              <div className="text-xs text-muted-foreground leading-relaxed font-semibold max-w-xl">
                Delete selected student accounts. This completely removes their profiles, course assignments, check-in records, geofence tokens, and security keys.
              </div>
              <ConfirmSubmitButton
                className="sm:w-auto h-9.5 rounded-xl font-bold shadow-sm text-xs"
                formAction={bulkDeleteStudentAccountsAction}
                message="Delete all selected student accounts? This removes their profiles, course enrolments, attendance records, activation tokens, and passkeys."
              >
                <Trash2 className="size-4" />
                <span>Delete Selected</span>
              </ConfirmSubmitButton>
            </form>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table className="min-w-[76rem]">
              <TableHeader className="bg-slate-950/[0.02] dark:bg-white/[0.01]">
                <TableRow className="hover:bg-transparent border-b border-border/30">
                  <TableHead className="w-12 px-6">
                    <BulkSelectionToggle />
                  </TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Student</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Account</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Course Assignments</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Classification</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Faculty / Department</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Group</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Created</TableHead>
                  <TableHead className="px-6 py-3 text-right font-semibold text-muted-foreground text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((student) => (
                  <TableRow key={student.studentId} className="hover:bg-muted/30 border-b border-border/20 transition-colors">
                    <TableCell className="px-6">
                      <input
                        aria-label={`Select ${student.studentName}`}
                        className="size-4 rounded border-border/60 text-primary bg-background/50 accent-primary focus:ring-primary/25 focus-visible:outline-none"
                        data-bulk-row
                        form="admin-student-bulk-form"
                        name="studentId"
                        type="checkbox"
                        value={student.studentId}
                      />
                    </TableCell>
                    <TableCell className="px-4 py-4.5">
                      <p className="text-sm font-extrabold text-foreground leading-snug">{student.studentName}</p>
                      <p className="text-[0.7rem] text-muted-foreground font-semibold mt-1">
                        {student.studentIdNumber} <span className="text-muted-foreground/35 mx-1">/</span> {student.studentEmail}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-4.5">
                      <StatusBadge status={student.accountStatus} />
                      <span className="block text-[0.68rem] text-muted-foreground font-semibold mt-1.5">
                        {student.activatedAt ? "Activated" : "Not Activated"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-4.5">
                      {student.enrolments.length > 0 ? (
                        <div className="max-w-[22rem] space-y-1.5">
                          {student.enrolments.slice(0, 2).map((enrolment) => (
                            <div key={enrolment.enrolmentId} className="text-xs">
                              <span className="font-bold text-foreground">{enrolment.courseCode}</span>
                              <span className="text-muted-foreground font-medium">
                                {" "}
                                / {enrolment.status} / {enrolment.classGroup}
                              </span>
                            </div>
                          ))}
                          {student.enrolments.length > 2 ? (
                            <p className="text-[0.68rem] text-primary font-bold">
                              +{student.enrolments.length - 2} more course assignments
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[0.65rem] font-bold text-muted-foreground bg-muted/20 border-border/50">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-bold text-foreground/80">
                      <span className="block">{studentCategoryLabel(student.studentCategory)}</span>
                      <span className="block text-muted-foreground">
                        {programmeLevelLabel(student.programmeLevel)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-bold text-foreground/80">
                      <span className="block">{student.facultyName ?? "-"}</span>
                      <span className="block text-muted-foreground">
                        {student.departmentName ?? "-"} / {student.academicYear ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-bold text-foreground/80">{student.classGroup ?? "-"}</TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">
                      {student.createdAt.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="px-6 py-4.5">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline" className="h-8.5 rounded-lg text-xs font-bold shadow-sm">
                          <Link href={`/admin/students/${student.studentId}/edit`} className="flex items-center gap-1">
                            <Pencil className="size-3.5" />
                            <span>Edit</span>
                          </Link>
                        </Button>
                        <form action={deleteStudentAccountAction}>
                          <input name="studentId" type="hidden" value={student.studentId} />
                          <ConfirmSubmitButton
                            className="w-auto h-8.5 rounded-lg text-xs font-bold shadow-sm"
                            message={`Delete ${student.studentName}'s student account? This removes their profile, course enrolments, attendance records, activation tokens, and passkeys.`}
                            size="sm"
                          >
                            <Trash2 className="size-3.5" />
                            <span>Delete</span>
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-44 text-center text-muted-foreground text-xs" colSpan={9}>
                      <div className="flex flex-col items-center justify-center gap-3 py-6">
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground/35 animate-pulse">
                          <Search className="size-6" />
                        </span>
                        <p className="font-semibold text-muted-foreground/60 text-sm">No student accounts found matching these filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border/20">
            {rows.map((student) => (
              <div key={student.studentId} className="p-5 flex flex-col gap-3.5">
                <div className="flex items-start gap-3">
                  <div className="pt-1">
                    <input
                      aria-label={`Select ${student.studentName}`}
                      className="size-4.5 rounded border-border/60 text-primary bg-background/50 accent-primary focus:ring-primary/25 focus-visible:outline-none"
                      data-bulk-row
                      form="admin-student-bulk-form"
                      name="studentId"
                      type="checkbox"
                      value={student.studentId}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-extrabold text-foreground leading-snug block truncate">{student.studentName}</span>
                        <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 truncate">
                          {student.studentIdNumber} <span className="text-muted-foreground/35 mx-1">/</span> {student.studentEmail}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge status={student.accountStatus} />
                        <span className="text-[9px] text-muted-foreground font-bold">
                          {student.activatedAt ? "Activated" : "Not Activated"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/[0.015] dark:bg-white/[0.015] p-3 rounded-xl border border-border/25 text-xs space-y-3">
                  <div>
                    <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider mb-1">Course Assignments</span>
                    {student.enrolments.length > 0 ? (
                      <div className="space-y-1.5">
                        {student.enrolments.map((enrolment) => (
                          <div key={enrolment.enrolmentId} className="text-[11px] leading-relaxed">
                            <span className="font-extrabold text-foreground">{enrolment.courseCode}</span>
                            <span className="text-muted-foreground font-semibold">
                              {" "}
                              / {enrolment.status} / {enrolment.classGroup}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[9px] font-bold text-muted-foreground bg-muted/20 border-border/50">Unassigned</Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-border/15">
                    <div>
                      <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Programme</span>
                      <span className="font-bold text-foreground/80 mt-0.5 block truncate">{student.programme || "-"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Level & Group</span>
                      <span className="font-bold text-foreground/80 mt-0.5 block truncate">
                        {student.level || "-"} / {student.classGroup || "-"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/15">
                    <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Created On</span>
                    <span className="font-bold text-foreground/80 mt-0.5 block">
                      {student.createdAt.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1.5">
                  <Button asChild size="sm" variant="outline" className="h-8.5 rounded-lg text-xs font-bold shadow-sm flex-1">
                    <Link href={`/admin/students/${student.studentId}/edit`} className="flex items-center justify-center gap-1.5">
                      <Pencil className="size-3.5" />
                      <span>Edit Profile</span>
                    </Link>
                  </Button>
                  <form action={deleteStudentAccountAction} className="flex-1">
                    <input name="studentId" type="hidden" value={student.studentId} />
                    <ConfirmSubmitButton
                      className="w-full h-8.5 rounded-lg text-xs font-bold shadow-sm"
                      message={`Delete ${student.studentName}'s student account? This removes their profile, course enrolments, attendance records, activation tokens, and passkeys.`}
                      size="sm"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Delete</span>
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>
            ))}
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 px-6">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground/35">
                  <Search className="size-6" />
                </span>
                <p className="font-semibold text-muted-foreground/60 text-sm">No student accounts found.</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
