import { eq } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDb } from "@/db/client";
import { courses, enrolments } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function StudentClassesPage() {
  const user = await requireRole("student");
  const db = getDb();

  const rows = await db
    .select({
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
      semester: courses.semester,
      academicYear: courses.academicYear,
      classGroup: courses.classGroup,
      status: enrolments.status,
    })
    .from(enrolments)
    .innerJoin(courses, eq(enrolments.courseId, courses.id))
    .where(eq(enrolments.studentId, user.studentProfileId ?? ""));

  return (
    <>
      <PageHeader
        title="Registered classes"
        description="Courses where your student profile is enrolled."
      />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.courseCode}-${row.academicYear}-${row.semester}`}>
                  <TableCell className="font-medium">{row.courseCode}</TableCell>
                  <TableCell>{row.courseTitle}</TableCell>
                  <TableCell>{row.semester}</TableCell>
                  <TableCell>{row.academicYear}</TableCell>
                  <TableCell>{row.classGroup}</TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={6}>
                    No classes are linked to your account yet.
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
