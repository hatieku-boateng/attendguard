import { eq } from "drizzle-orm";

import { createAssignedCourseAction } from "@/app/admin/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDb } from "@/db/client";
import { courseCatalog, lecturerProfiles, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function NewAdminCoursePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("administrator");
  const params = await searchParams;
  const db = getDb();
  const lecturers = await db
    .select({
      id: lecturerProfiles.id,
      name: users.name,
      email: users.email,
    })
    .from(lecturerProfiles)
    .innerJoin(users, eq(lecturerProfiles.userId, users.id));
  const catalogCourses = await db
    .select()
    .from(courseCatalog)
    .where(eq(courseCatalog.status, "active"));

  return (
    <>
      <PageHeader
        title="Assign course"
        description="Select a catalogue course and assign it to a lecturer for a semester or class group."
      />
      <div className="max-w-2xl mx-auto">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
          <CardContent className="pt-8 px-6 sm:px-8">
            <form action={createAssignedCourseAction} className="grid gap-5 sm:grid-cols-2">
              {params.error ? (
                <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed sm:col-span-2">
                  Complete all required fields and select a valid course and lecturer.
                </p>
              ) : null}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="catalogCourseId" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Course</Label>
                <Select name="catalogCourseId" required>
                  <SelectTrigger id="catalogCourseId">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogCourses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.courseCode} - {course.courseTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="lecturerId" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned lecturer</Label>
                <Select name="lecturerId" required>
                  <SelectTrigger id="lecturerId">
                    <SelectValue placeholder="Select lecturer" />
                  </SelectTrigger>
                  <SelectContent>
                    {lecturers.map((lecturer) => (
                      <SelectItem key={lecturer.id} value={lecturer.id}>
                        {lecturer.name} ({lecturer.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="semester" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Semester</Label>
                <Input id="semester" name="semester" placeholder="Semester 1" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="academicYear" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Academic year</Label>
                <Input id="academicYear" name="academicYear" placeholder="2026/2027" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="classGroup" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Class group</Label>
                <Input id="classGroup" name="classGroup" placeholder="main" />
              </div>
              <div className="flex items-end">
                <Button className="w-full py-5 rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg text-sm" type="submit">
                  Assign course
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
