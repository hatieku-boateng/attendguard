import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { Pencil, Plus, Search } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { academicYears, courseCatalog, departments, faculties } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { ensureDefaultFacultyDepartment, ensureGeneratedAcademicYears } from "@/lib/institution-data";

export default async function AdminCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    facultyId?: string;
    departmentId?: string;
    academicYearId?: string;
    status?: string;
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

  return (
    <>
      <PageHeader
        title="Course Catalogue"
        description="Register curriculum courses to form reusable catalog items that can be assigned to lecturers."
        actions={
          <Button asChild className="rounded-xl shadow-sm">
            <Link href="/admin/catalog/new" className="flex items-center gap-1.5">
              <Plus className="size-4.5" />
              <span>Create Course Template</span>
            </Link>
          </Button>
        }
      />
      <Card className="glass-panel glass-panel-hover overflow-hidden relative border-border/40">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
        <CardContent className="space-y-5 pt-6 px-0">
          <form className="mx-4 grid max-w-[calc(100%-2rem)] gap-3 sm:mx-5 sm:max-w-[calc(100%-2.5rem)] lg:grid-cols-[minmax(0,1fr)_220px_220px_180px_150px_auto]">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-full min-w-0 pl-9"
                defaultValue={query.q ?? ""}
                name="q"
                placeholder="Search course, programme, faculty, department"
              />
            </div>
            <select className="h-9 w-full min-w-0 rounded-lg border bg-card px-3 text-sm" defaultValue={query.facultyId ?? "all"} name="facultyId">
              <option value="all">All faculties</option>
              {facultyRows.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>{faculty.name}</option>
              ))}
            </select>
            <select className="h-9 w-full min-w-0 rounded-lg border bg-card px-3 text-sm" defaultValue={query.departmentId ?? "all"} name="departmentId">
              <option value="all">All departments</option>
              {departmentRows.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
            <select className="h-9 w-full min-w-0 rounded-lg border bg-card px-3 text-sm" defaultValue={query.academicYearId ?? "all"} name="academicYearId">
              <option value="all">All years</option>
              {academicYearRows.map((year) => (
                <option key={year.id} value={year.id}>{year.displayName}</option>
              ))}
            </select>
            <select className="h-9 w-full min-w-0 rounded-lg border bg-card px-3 text-sm" defaultValue={query.status ?? "all"} name="status">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <Button className="w-full lg:w-auto" type="submit">Filter</Button>
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
                        <Link href={`/admin/catalog/${course.id}/edit`} className="flex items-center gap-1.5">
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
                    <Link href={`/admin/catalog/${course.id}/edit`} className="flex items-center justify-center gap-1.5">
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
    </>
  );
}
