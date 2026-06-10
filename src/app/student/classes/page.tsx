import { eq, inArray } from "drizzle-orm";

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
import { courseResources, courses, enrolments } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function StudentClassesPage() {
  const user = await requireRole("student");
  const db = getDb();

  const rows = await db
    .select({
      courseCode: courses.courseCode,
      courseId: courses.id,
      courseTitle: courses.courseTitle,
      semester: courses.semester,
      academicYear: courses.academicYear,
      classGroup: courses.classGroup,
      status: enrolments.status,
    })
    .from(enrolments)
    .innerJoin(courses, eq(enrolments.courseId, courses.id))
    .where(eq(enrolments.studentId, user.studentProfileId ?? ""));
  const resources = rows.length
    ? await db
        .select({
          id: courseResources.id,
          courseId: courseResources.courseId,
          title: courseResources.title,
          resourceType: courseResources.resourceType,
          resourceUrl: courseResources.resourceUrl,
          description: courseResources.description,
        })
        .from(courseResources)
        .where(
          inArray(
            courseResources.courseId,
            rows.map((row) => row.courseId),
          ),
        )
    : [];

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
      <Card className="mt-6">
        <CardContent className="space-y-4 pt-6">
          <h2 className="text-lg font-semibold">Course resources</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {resources.map((resource) => {
              const course = rows.find((row) => row.courseId === resource.courseId);

              return (
                <div className="rounded-lg border p-4" key={resource.id}>
                  <p className="text-xs uppercase tracking-normal text-muted-foreground">
                    {course?.courseCode} / {resource.resourceType}
                  </p>
                  <p className="mt-1 font-medium">{resource.title}</p>
                  {resource.description ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {resource.description}
                    </p>
                  ) : null}
                  <a
                    className="mt-3 block text-sm font-medium text-primary"
                    href={resource.resourceUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open resource
                  </a>
                </div>
              );
            })}
          </div>
          {resources.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No course resources are available yet.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
