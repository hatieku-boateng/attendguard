import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
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
import { getDb } from "@/db/client";
import { courses } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function LecturerCoursesPage() {
  const user = await requireRole(["lecturer", "administrator"]);
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
        description="Create classes, manage course information, and open each roster for student enrolment."
        actions={
          <Button asChild>
            <Link href="/lecturer/courses/new">
              <Plus className="size-4" />
              New course
            </Link>
          </Button>
        }
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
                    No courses have been created yet.
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
