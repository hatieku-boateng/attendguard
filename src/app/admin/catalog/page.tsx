import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDb } from "@/db/client";
import { academicYears, courseCatalog, departments, faculties } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { ensureDefaultFacultyDepartment, ensureGeneratedAcademicYears } from "@/lib/institution-data";
import { FormModal } from "@/components/form-modal";
import {
  createCatalogCourseAction,
  updateCatalogCourseAction,
  deleteCatalogCourseAction,
} from "@/app/admin/actions";

export default async function AdminCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    facultyId?: string;
    departmentId?: string;
    academicYearId?: string;
    status?: string;
    modal?: string;
    id?: string;
    error?: string;
  }>;
}) {
  await requireRole("administrator");
  await ensureDefaultFacultyDepartment();
  await ensureGeneratedAcademicYears();
  const query = await searchParams;
  const searchTerm = (query.q ?? "").trim().toLowerCase();
  const db = getDb();
  
  const [courseRows, facultyRows, departmentRows, academicYearRows] = await Promise.all([
    db
      .select({
        id: courseCatalog.id,
        courseCode: courseCatalog.courseCode,
        courseTitle: courseCatalog.courseTitle,
        programme: courseCatalog.programme,
        level: courseCatalog.level,
        description: courseCatalog.description,
        status: courseCatalog.status,
        createdAt: courseCatalog.createdAt,
        facultyId: courseCatalog.facultyId,
        departmentId: courseCatalog.departmentId,
        academicYearId: courseCatalog.academicYearId,
        facultyName: faculties.name,
        departmentName: departments.name,
        academicYear: academicYears.displayName,
      })
      .from(courseCatalog)
      .leftJoin(faculties, eq(courseCatalog.facultyId, faculties.id))
      .leftJoin(departments, eq(courseCatalog.departmentId, departments.id))
      .leftJoin(academicYears, eq(courseCatalog.academicYearId, academicYears.id))
      .orderBy(desc(courseCatalog.createdAt)),
    db.select().from(faculties).orderBy(asc(faculties.name)),
    db.select().from(departments).orderBy(asc(departments.name)),
    db.select().from(academicYears).orderBy(asc(academicYears.startYear)),
  ]);

  const courses = courseRows.filter((course) => {
    if (query.facultyId && query.facultyId !== "all" && course.facultyId !== query.facultyId) {
      return false;
    }

    if (
      query.departmentId &&
      query.departmentId !== "all" &&
      course.departmentId !== query.departmentId
    ) {
      return false;
    }

    if (
      query.academicYearId &&
      query.academicYearId !== "all" &&
      course.academicYearId !== query.academicYearId
    ) {
      return false;
    }

    if (query.status && query.status !== "all" && course.status !== query.status) {
      return false;
    }

    if (!searchTerm) {
      return true;
    }

    return [
      course.courseCode,
      course.courseTitle,
      course.description ?? "",
      course.programme ?? "",
      course.level ?? "",
      course.facultyName ?? "",
      course.departmentName ?? "",
      course.academicYear ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm);
  });

  // Fetch course for edit modal if open
  let editCourse = null;
  if (query.modal === "edit" && query.id) {
    [editCourse] = await db
      .select()
      .from(courseCatalog)
      .where(eq(courseCatalog.id, query.id))
      .limit(1);
  }

  const errorMessages: Record<string, string> = {
    missing: "Enter a course code and course title.",
    exists: "A catalogue course already exists with that code.",
    department: "Please select a valid department belonging to the selected faculty.",
  };

  return (
    <>
      <PageHeader
        title="Course Catalogue"
        description="Register curriculum courses to form reusable catalog items that can be assigned to lecturers."
        actions={
          <Button asChild className="rounded-xl shadow-sm">
            <Link href="/admin/catalog?modal=new" className="flex items-center gap-1.5">
              <Plus className="size-4.5" />
              <span>Create Course Template</span>
            </Link>
          </Button>
        }
      />
      <Card className="glass-panel glass-panel-hover overflow-hidden relative border-border/40">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
        <CardContent className="space-y-5 pt-6 px-0">
          <form className="mx-5 grid gap-3 lg:grid-cols-[1fr_220px_220px_180px_150px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                defaultValue={query.q ?? ""}
                name="q"
                placeholder="Search course, programme, faculty, department"
              />
            </div>
            <select className="h-9 rounded-lg border bg-card px-3 text-sm" defaultValue={query.facultyId ?? "all"} name="facultyId">
              <option value="all">All faculties</option>
              {facultyRows.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>{faculty.name}</option>
              ))}
            </select>
            <select className="h-9 rounded-lg border bg-card px-3 text-sm" defaultValue={query.departmentId ?? "all"} name="departmentId">
              <option value="all">All departments</option>
              {departmentRows.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
            <select className="h-9 rounded-lg border bg-card px-3 text-sm" defaultValue={query.academicYearId ?? "all"} name="academicYearId">
              <option value="all">All years</option>
              {academicYearRows.map((year) => (
                <option key={year.id} value={year.id}>{year.displayName}</option>
              ))}
            </select>
            <select className="h-9 rounded-lg border bg-card px-3 text-sm" defaultValue={query.status ?? "all"} name="status">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <Button type="submit">Filter</Button>
          </form>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-950/[0.02] dark:bg-white/[0.01]">
                <TableRow className="hover:bg-transparent border-b border-border/30">
                  <TableHead className="px-6 py-3 font-semibold text-muted-foreground text-xs">Course Details</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Programme / Major</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Level</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Faculty / Department</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Status</TableHead>
                  <TableHead className="px-6 py-3 text-right font-semibold text-muted-foreground text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id} className="hover:bg-muted/30 border-b border-border/20 transition-colors">
                    <TableCell className="px-6 py-4.5">
                      <p className="text-sm font-extrabold text-foreground leading-snug">{course.courseCode}</p>
                      <p className="text-[0.7rem] text-muted-foreground font-semibold mt-1">
                        {course.courseTitle}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-bold text-foreground/80">{course.programme || "-"}</TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-bold text-foreground/80">{course.level || "-"}</TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-bold text-foreground/80">
                      <span className="block">{course.facultyName ?? "-"}</span>
                      <span className="block text-muted-foreground">
                        {course.departmentName ?? "-"} / {course.academicYear ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-4.5">
                      <StatusBadge status={course.status} />
                    </TableCell>
                    <TableCell className="px-6 py-4.5 text-right">
                      <Button asChild size="sm" variant="outline" className="h-8.5 rounded-lg text-xs font-bold shadow-sm">
                        <Link href={`/admin/catalog?modal=edit&id=${course.id}`} className="flex items-center gap-1.5">
                          <Pencil className="size-3.5" />
                          <span>Edit</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {courses.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-44 text-center text-muted-foreground text-xs" colSpan={6}>
                      <div className="flex flex-col items-center justify-center gap-3 py-6">
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground/35 animate-pulse">
                          <Plus className="size-6" />
                        </span>
                        <p className="font-semibold text-muted-foreground/60 text-sm">No course templates created.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border/20">
            {courses.map((course) => (
              <div key={course.id} className="p-5 flex flex-col gap-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-extrabold text-foreground leading-snug">{course.courseCode}</span>
                    <h3 className="text-xs text-muted-foreground font-semibold mt-1 leading-relaxed">{course.courseTitle}</h3>
                  </div>
                  <StatusBadge status={course.status} />
                </div>
                
                <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-950/[0.015] dark:bg-white/[0.015] p-3 rounded-xl border border-border/25">
                  <div>
                    <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Programme</span>
                    <span className="font-bold text-foreground/80 mt-0.5 block truncate">{course.programme || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Level</span>
                    <span className="font-bold text-foreground/80 mt-0.5 block truncate">{course.level || "-"}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1.5">
                  <Button asChild size="sm" variant="outline" className="h-8.5 rounded-lg text-xs font-bold shadow-sm w-full">
                    <Link href={`/admin/catalog?modal=edit&id=${course.id}`} className="flex items-center justify-center gap-1.5">
                      <Pencil className="size-3.5" />
                      <span>Edit Template</span>
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
            {courses.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 px-6">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground/35">
                  <Plus className="size-6" />
                </span>
                <p className="font-semibold text-muted-foreground/60 text-sm">No course templates created.</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* New Course Modal */}
      <FormModal
        isOpen={query.modal === "new"}
        title="New catalogue course"
        description="Create the course record once. Lecturer assignment happens separately."
        className="sm:max-w-xl"
      >
        <form action={createCatalogCourseAction} className="grid gap-4 sm:grid-cols-2 pt-2">
          {query.error && errorMessages[query.error] ? (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed sm:col-span-2">
              {errorMessages[query.error]}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="courseCode" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Course code</Label>
            <Input className="uppercase-input" id="courseCode" name="courseCode" placeholder="CSM 201" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="courseTitle" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Course title</Label>
            <Input id="courseTitle" name="courseTitle" placeholder="e.g. Introduction to Databases" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="programme" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Programme</Label>
            <Input id="programme" name="programme" placeholder="e.g. Computer Science" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="level" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Level</Label>
            <Input id="level" name="level" placeholder="e.g. 200" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="facultyId" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Faculty</Label>
            <select className="h-9 w-full rounded-lg border bg-card px-3 text-sm" id="facultyId" name="facultyId">
              <option value="">Select faculty</option>
              {facultyRows.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>{faculty.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="departmentId" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Department</Label>
            <select className="h-9 w-full rounded-lg border bg-card px-3 text-sm" id="departmentId" name="departmentId">
              <option value="">Select department</option>
              {departmentRows.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="academicYearId" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Academic year</Label>
            <select className="h-9 w-full rounded-lg border bg-card px-3 text-sm" id="academicYearId" name="academicYearId">
              <option value="">Select academic year</option>
              {academicYearRows.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.displayName}{year.isCurrent ? " (current)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
            <Textarea id="description" name="description" placeholder="A brief description of the course scope..." rows={3} />
          </div>
          <div className="sm:col-span-2 pt-2">
            <Button className="w-full py-5 rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg text-sm" type="submit">
              Create catalogue course
            </Button>
          </div>
        </form>
      </FormModal>

      {/* Edit Course Modal */}
      {editCourse && (
        <FormModal
          isOpen={query.modal === "edit" && !!editCourse}
          title="Edit catalogue course"
          description="Update the reusable course record used for lecturer assignments."
          className="sm:max-w-2xl"
        >
          <div className="grid gap-6 pt-2 md:grid-cols-[1fr_200px]">
            <form action={updateCatalogCourseAction} className="grid gap-4 sm:grid-cols-2">
              <input name="catalogCourseId" type="hidden" value={editCourse.id} />
              {query.error && errorMessages[query.error] ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
                  {errorMessages[query.error]}
                </p>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="courseCode">Course code</Label>
                <Input
                  className="uppercase-input"
                  defaultValue={editCourse.courseCode}
                  id="courseCode"
                  name="courseCode"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="courseTitle">Course title</Label>
                <Input
                  defaultValue={editCourse.courseTitle}
                  id="courseTitle"
                  name="courseTitle"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="programme">Programme</Label>
                <Input defaultValue={editCourse.programme ?? ""} id="programme" name="programme" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="level">Level</Label>
                <Input defaultValue={editCourse.level ?? ""} id="level" name="level" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue={editCourse.status} name="status">
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="facultyId">Faculty</Label>
                <select
                  className="h-9 w-full rounded-lg border bg-card px-3 text-sm"
                  defaultValue={editCourse.facultyId ?? ""}
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
              <div className="space-y-1.5">
                <Label htmlFor="departmentId">Department</Label>
                <select
                  className="h-9 w-full rounded-lg border bg-card px-3 text-sm"
                  defaultValue={editCourse.departmentId ?? ""}
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
              <div className="space-y-1.5">
                <Label htmlFor="academicYearId">Academic year</Label>
                <select
                  className="h-9 w-full rounded-lg border bg-card px-3 text-sm"
                  defaultValue={editCourse.academicYearId ?? ""}
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
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  defaultValue={editCourse.description ?? ""}
                  id="description"
                  name="description"
                  rows={3}
                />
              </div>
              <div className="sm:col-span-2 pt-2">
                <Button className="w-full" type="submit">
                  Save course
                </Button>
              </div>
            </form>
            
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-4 text-xs text-muted-foreground flex flex-col justify-between h-fit self-start">
              <div>
                <h4 className="font-extrabold text-foreground uppercase tracking-wider mb-2">Delete Course</h4>
                <p className="leading-relaxed">
                  Removing this catalogue item restricts future selections. Existing assigned offerings are unaffected.
                </p>
              </div>
              <form action={deleteCatalogCourseAction}>
                <input name="catalogCourseId" type="hidden" value={editCourse.id} />
                <ConfirmSubmitButton message="Delete this catalogue course? Existing assignments will keep their copied course details." className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8.5 rounded-lg flex items-center justify-center gap-1.5 font-bold">
                  <Trash2 className="size-3.5" />
                  <span>Delete Template</span>
                </ConfirmSubmitButton>
              </form>
            </div>
          </div>
        </FormModal>
      )}
    </>
  );
}
