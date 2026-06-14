import { asc, eq } from "drizzle-orm";

import {
  deleteCatalogCourseAction,
  updateCatalogCourseAction,
} from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getDb } from "@/db/client";
import { academicYears, courseCatalog, departments, faculties } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { ensureDefaultFacultyDepartment, ensureGeneratedAcademicYears } from "@/lib/institution-data";

export default async function EditCatalogCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ catalogCourseId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("administrator");
  await ensureDefaultFacultyDepartment();
  await ensureGeneratedAcademicYears();
  const { catalogCourseId } = await params;
  const query = await searchParams;
  const db = getDb();
  const [[course], facultyRows, departmentRows, academicYearRows] = await Promise.all([
    db.select().from(courseCatalog).where(eq(courseCatalog.id, catalogCourseId)).limit(1),
    db.select().from(faculties).orderBy(asc(faculties.name)),
    db.select().from(departments).orderBy(asc(departments.name)),
    db.select().from(academicYears).orderBy(asc(academicYears.startYear)),
  ]);

  if (!course) {
    return <PageHeader title="Catalogue course not found" />;
  }

  return (
    <>
      <PageHeader
        title="Edit catalogue course"
        description="Update the reusable course record used for lecturer assignments."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="pt-6">
            <form action={updateCatalogCourseAction} className="grid gap-5 sm:grid-cols-2">
              <input name="catalogCourseId" type="hidden" value={course.id} />
              {query.error ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
                  Enter a valid course code and title.
                </p>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="courseCode">Course code</Label>
                <Input
                  className="uppercase-input"
                  defaultValue={course.courseCode}
                  id="courseCode"
                  name="courseCode"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courseTitle">Course title</Label>
                <Input
                  defaultValue={course.courseTitle}
                  id="courseTitle"
                  name="courseTitle"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="programme">Programme</Label>
                <Input defaultValue={course.programme ?? ""} id="programme" name="programme" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <Input defaultValue={course.level ?? ""} id="level" name="level" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue={course.status} name="status">
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="facultyId">Faculty</Label>
                <select
                  className="h-9 w-full rounded-lg border bg-card px-3 text-sm"
                  defaultValue={course.facultyId ?? ""}
                  id="facultyId"
                  name="facultyId"
                >
                  <option value="">Select faculty</option>
                  {facultyRows.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="departmentId">Department</Label>
                <select
                  className="h-9 w-full rounded-lg border bg-card px-3 text-sm"
                  defaultValue={course.departmentId ?? ""}
                  id="departmentId"
                  name="departmentId"
                >
                  <option value="">Select department</option>
                  {departmentRows.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="academicYearId">Academic year</Label>
                <select
                  className="h-9 w-full rounded-lg border bg-card px-3 text-sm"
                  defaultValue={course.academicYearId ?? ""}
                  id="academicYearId"
                  name="academicYearId"
                >
                  <option value="">Select academic year</option>
                  {academicYearRows.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.displayName}
                      {year.isCurrent ? " (current)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  defaultValue={course.description ?? ""}
                  id="description"
                  name="description"
                  rows={4}
                />
              </div>
              <div className="sm:col-span-2">
                <Button className="w-full" type="submit">
                  Save course
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Delete course</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Deleting this catalogue item removes it from future dropdowns.
              Existing assigned offerings keep their copied course details.
            </p>
            <form action={deleteCatalogCourseAction}>
              <input name="catalogCourseId" type="hidden" value={course.id} />
              <ConfirmSubmitButton message="Delete this catalogue course? Existing assignments will keep their copied course details.">
                Delete catalogue course
              </ConfirmSubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
