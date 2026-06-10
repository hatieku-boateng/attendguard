import Link from "next/link";
import { eq } from "drizzle-orm";
import { Pencil, Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { courses, lecturerProfiles, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function AdminCoursesPage() {
  await requireRole("administrator");
  const db = getDb();
  const rows = await db
    .select({
      id: courses.id,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
      semester: courses.semester,
      academicYear: courses.academicYear,
      classGroup: courses.classGroup,
      status: courses.status,
      lecturerName: users.name,
      lecturerEmail: users.email,
    })
    .from(courses)
    .innerJoin(lecturerProfiles, eq(courses.lecturerId, lecturerProfiles.id))
    .innerJoin(users, eq(lecturerProfiles.userId, users.id));

  return (
    <>
      <PageHeader
        title="Courses"
        description="Assigned course offerings connected to lecturers for attendance operations."
        actions={
          <Button asChild>
            <Link href="/admin/courses/new">
              <Plus className="size-4" />
              Assign course
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Assigned lecturer</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">
                    {course.courseCode}: {course.courseTitle}
                  </TableCell>
                  <TableCell>
                    {course.lecturerName}
                    <span className="block text-xs text-muted-foreground">
                      {course.lecturerEmail}
                    </span>
                  </TableCell>
                  <TableCell>{course.semester}</TableCell>
                  <TableCell>{course.academicYear}</TableCell>
                  <TableCell>{course.classGroup}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{course.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/courses/${course.id}/edit`}>
                        <Pencil className="size-4" />
                        Manage
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={7}>
                    No courses have been assigned yet.
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
