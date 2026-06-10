import Link from "next/link";
import { desc, eq } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
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
import { getDb } from "@/db/client";
import { courses } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function LecturerCoursesPage() {
  const user = await requireRole("lecturer");
  const db = getDb();

  const rows = user.lecturerProfileId
    ? await db
        .select()
        .from(courses)
        .where(eq(courses.lecturerId, user.lecturerProfileId))
        .orderBy(desc(courses.createdAt))
    : [];

  return (
    <>
      <PageHeader
        title="Courses"
        description="Courses assigned by the administrator. Open a course to enrol students and manage attendance."
      />
      <Card>
        <CardHeader>
          <CardTitle>Course list</CardTitle>
          <CardDescription>
            Each course can have its own class group and attendance sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {rows.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">
                    <Link href={`/lecturer/courses/${course.id}`}>
                      {course.courseCode}
                    </Link>
                  </TableCell>
                  <TableCell>{course.courseTitle}</TableCell>
                  <TableCell>{course.semester}</TableCell>
                  <TableCell>{course.academicYear}</TableCell>
                  <TableCell>{course.classGroup}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{course.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={6}>
                    No courses have been assigned to you yet.
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
