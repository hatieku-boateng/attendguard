import { eq } from "drizzle-orm";
import { Download } from "lucide-react";

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
import { getDb } from "@/db/client";
import { courses } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function LecturerReportsPage() {
  const user = await requireRole("lecturer");
  const db = getDb();
  const rows = await db
    .select()
    .from(courses)
    .where(eq(courses.lecturerId, user.lecturerProfileId ?? ""));

  return (
    <>
      <PageHeader
        title="Reports"
        description="Export attendance data for courses and sessions."
        actions={
          <Button asChild>
            <a href="/api/reports/attendance">
              <Download className="size-4" />
              Export all CSV
            </a>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Course exports</CardTitle>
          <CardDescription>
            CSV export includes student, session, check-in, status, distance, accuracy,
            rejection reason, and lecturer remarks where available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Export</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    {course.courseCode}: {course.courseTitle}
                  </TableCell>
                  <TableCell>{course.semester}</TableCell>
                  <TableCell>{course.academicYear}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <a href={`/api/reports/attendance?courseId=${course.id}`}>
                        Download CSV
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={4}>
                    No courses are available for reporting yet.
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
