import { and, eq } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default async function LecturerCourseStudentsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
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
      enrolmentStatus: enrolments.status,
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
        description="View the administrator-managed roster for this assigned course."
        title={`${course.courseCode} students`}
      />

      <Card className="glass-panel border-border/40 overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
        <CardHeader className="border-b border-border/30 pb-4">
          <CardTitle className="text-base font-bold">Class roster</CardTitle>
          <CardDescription className="text-xs">
            {students.filter((student) => student.enrolmentStatus === "active").length} active
            of {students.length} student record(s). Enrolment changes are managed by the
            administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6">Name</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Programme</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Enrolment</TableHead>
                  <TableHead>Account</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.enrolmentId}>
                    <TableCell className="px-6 font-bold">{student.name}</TableCell>
                    <TableCell className="text-xs font-semibold">{student.studentIdNumber}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{student.email}</TableCell>
                    <TableCell className="text-xs">{student.programme || "-"}</TableCell>
                    <TableCell className="text-xs">{student.level || "-"}</TableCell>
                    <TableCell><StatusBadge status={student.enrolmentStatus} /></TableCell>
                    <TableCell><StatusBadge status={student.activatedAt ? "active" : student.accountStatus} /></TableCell>
                  </TableRow>
                ))}
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-28 text-center text-sm text-muted-foreground" colSpan={7}>
                      No students have been assigned by the administrator.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="divide-y divide-border/30 md:hidden">
            {students.map((student) => (
              <div className="space-y-3 p-5" key={student.enrolmentId}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">{student.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{student.studentIdNumber}</p>
                  </div>
                  <StatusBadge status={student.enrolmentStatus} />
                </div>
                <div className="grid grid-cols-2 gap-3 border border-border/50 bg-muted/25 p-3 text-xs">
                  <div><span className="block text-muted-foreground">Programme</span><strong>{student.programme || "-"}</strong></div>
                  <div><span className="block text-muted-foreground">Level</span><strong>{student.level || "-"}</strong></div>
                  <div className="col-span-2 min-w-0"><span className="block text-muted-foreground">Email</span><strong className="break-all">{student.email}</strong></div>
                </div>
              </div>
            ))}
            {students.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                No students have been assigned by the administrator.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
