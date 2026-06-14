import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { BookOpen } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
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
      <Card className="glass-panel glass-panel-hover overflow-hidden relative border-border/40">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
        <CardHeader className="border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01] pb-4">
          <CardTitle className="text-base font-bold text-foreground">Course List</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Each course can have its own class group, geofenced sessions, and resource lists.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-950/[0.02] dark:bg-white/[0.01]">
                <TableRow className="hover:bg-transparent border-b border-border/30">
                  <TableHead className="px-6 py-3 font-semibold text-muted-foreground text-xs">Code</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Title</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Semester</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Year</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Group</TableHead>
                  <TableHead className="px-6 py-3 text-right font-semibold text-muted-foreground text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((course) => (
                  <TableRow key={course.id} className="hover:bg-muted/30 border-b border-border/20 transition-colors">
                    <TableCell className="px-6 py-4.5 font-extrabold text-primary text-sm hover:underline">
                      <Link href={`/lecturer/courses/${course.id}`}>
                        {course.courseCode}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-4.5 font-bold text-foreground/95 text-sm">{course.courseTitle}</TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">{course.semester}</TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">{course.academicYear}</TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-bold text-foreground/80">{course.classGroup}</TableCell>
                    <TableCell className="px-6 py-4.5 text-right">
                      <StatusBadge status={course.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-44 text-center text-muted-foreground text-xs" colSpan={6}>
                      <div className="flex flex-col items-center justify-center gap-3 py-6">
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground/35 animate-pulse">
                          <BookOpen className="size-6" />
                        </span>
                        <p className="font-semibold text-muted-foreground/60 text-sm">No courses have been assigned to you yet.</p>
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
