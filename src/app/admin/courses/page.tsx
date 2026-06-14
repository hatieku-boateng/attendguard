import Link from "next/link";
import { eq } from "drizzle-orm";
import { Pencil, Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
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
        title="Course Assignments"
        description="Attach registered course catalog templates to verified lecturers to initiate attendance geofencing perimeters."
        actions={
          <Button asChild className="rounded-xl shadow-sm">
            <Link href="/admin/courses/new" className="flex items-center gap-1.5">
              <Plus className="size-4.5" />
              <span>Assign Course Offering</span>
            </Link>
          </Button>
        }
      />
      <Card className="glass-panel glass-panel-hover overflow-hidden relative border-border/40">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
        <CardContent className="pt-6 px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-950/[0.02] dark:bg-white/[0.01]">
                <TableRow className="hover:bg-transparent border-b border-border/30">
                  <TableHead className="px-6 py-3 font-semibold text-muted-foreground text-xs">Course Details</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Assigned Lecturer</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Semester</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Academic Year</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Class Group</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Status</TableHead>
                  <TableHead className="px-6 py-3 text-right font-semibold text-muted-foreground text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((course) => (
                  <TableRow key={course.id} className="hover:bg-muted/30 border-b border-border/20 transition-colors">
                    <TableCell className="px-6 py-4.5 font-bold text-foreground text-sm">
                      <span className="font-extrabold text-foreground">{course.courseCode}</span>: {course.courseTitle}
                    </TableCell>
                    <TableCell className="px-4 py-4.5">
                      <p className="text-xs font-extrabold text-foreground">{course.lecturerName}</p>
                      <p className="text-[0.68rem] text-muted-foreground font-semibold mt-1">
                        {course.lecturerEmail}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">{course.semester}</TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">{course.academicYear}</TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-bold text-foreground/85">{course.classGroup}</TableCell>
                    <TableCell className="px-4 py-4.5">
                      <StatusBadge status={course.status} />
                    </TableCell>
                    <TableCell className="px-6 py-4.5 text-right">
                      <Button asChild size="sm" variant="outline" className="h-8.5 rounded-lg text-xs font-bold shadow-sm">
                        <Link href={`/admin/courses/${course.id}/edit`} className="flex items-center gap-1.5">
                          <Pencil className="size-3.5" />
                          <span>Manage</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-44 text-center text-muted-foreground text-xs" colSpan={7}>
                      <div className="flex flex-col items-center justify-center gap-3 py-6">
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground/35 animate-pulse">
                          <Plus className="size-6" />
                        </span>
                        <p className="font-semibold text-muted-foreground/60 text-sm">No course offerings assigned yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
