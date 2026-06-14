import Link from "next/link";
import { eq } from "drizzle-orm";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { getDb } from "@/db/client";
import { courses, lecturerProfiles, users, courseCatalog } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { FormModal } from "@/components/form-modal";
import {
  createAssignedCourseAction,
  updateAssignedCourseAction,
  deleteAssignedCourseAction,
} from "@/app/admin/actions";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ modal?: string; id?: string; error?: string }>;
}) {
  await requireRole("administrator");
  const params = await searchParams;
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

  // Fetch lists for modals
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

  // Fetch course for edit modal
  let editCourse = null;
  if (params.modal === "edit" && params.id) {
    [editCourse] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, params.id))
      .limit(1);
  }

  return (
    <>
      <PageHeader
        title="Course Assignments"
        description="Attach registered course catalog templates to verified lecturers to initiate attendance geofencing perimeters."
        actions={
          <Button asChild className="rounded-xl shadow-sm">
            <Link href="/admin/courses?modal=new" className="flex items-center gap-1.5">
              <Plus className="size-4.5" />
              <span>Assign Course Offering</span>
            </Link>
          </Button>
        }
      />
      <Card className="glass-panel glass-panel-hover overflow-hidden relative border-border/40">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
        <CardContent className="pt-6 px-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
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
                        <Link href={`/admin/courses?modal=edit&id=${course.id}`} className="flex items-center gap-1.5">
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

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border/20">
            {rows.map((course) => (
              <div key={course.id} className="p-5 flex flex-col gap-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-extrabold text-foreground leading-snug">{course.courseCode}</span>
                    <h3 className="text-xs text-muted-foreground font-semibold mt-1 leading-relaxed">{course.courseTitle}</h3>
                  </div>
                  <StatusBadge status={course.status} />
                </div>
                
                <div className="bg-slate-950/[0.015] dark:bg-white/[0.015] p-3 rounded-xl border border-border/25 text-xs space-y-2.5">
                  <div>
                    <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Assigned Lecturer</span>
                    <span className="font-extrabold text-foreground/80 mt-0.5 block">{course.lecturerName}</span>
                    <span className="text-[10px] text-muted-foreground/70 block mt-0.5">{course.lecturerEmail}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/15">
                    <div>
                      <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Semester</span>
                      <span className="font-bold text-foreground/80 mt-0.5 block">{course.semester}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Year</span>
                      <span className="font-bold text-foreground/80 mt-0.5 block truncate">{course.academicYear}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Group</span>
                      <span className="font-bold text-foreground/80 mt-0.5 block">{course.classGroup}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1.5">
                  <Button asChild size="sm" variant="outline" className="h-8.5 rounded-lg text-xs font-bold shadow-sm w-full">
                    <Link href={`/admin/courses?modal=edit&id=${course.id}`} className="flex items-center justify-center gap-1.5">
                      <Pencil className="size-3.5" />
                      <span>Manage Offering</span>
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 px-6">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground/35">
                  <Plus className="size-6" />
                </span>
                <p className="font-semibold text-muted-foreground/60 text-sm">No course offerings assigned yet.</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Assign Course Offering Modal */}
      <FormModal
        isOpen={params.modal === "new"}
        title="Assign course"
        description="Select a catalogue course and assign it to a lecturer for a semester or class group."
        className="sm:max-w-xl"
      >
        <form action={createAssignedCourseAction} className="grid gap-4 sm:grid-cols-2 pt-2">
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="classGroup" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Class group</Label>
            <Input id="classGroup" name="classGroup" placeholder="main" />
          </div>
          <div className="sm:col-span-2 pt-2">
            <Button className="w-full py-5 rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg text-sm" type="submit">
              Assign course
            </Button>
          </div>
        </form>
      </FormModal>

      {/* Edit Course Offering Modal */}
      {editCourse && (
        <FormModal
          isOpen={params.modal === "edit" && !!editCourse}
          title="Manage assignment"
          description={`${editCourse.courseCode}: ${editCourse.courseTitle}`}
          className="sm:max-w-2xl"
        >
          <div className="grid gap-6 pt-2 md:grid-cols-[1fr_200px]">
            <form action={updateAssignedCourseAction} className="grid gap-4 sm:grid-cols-2">
              <input name="courseId" type="hidden" value={editCourse.id} />
              {params.error ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
                  Select a lecturer and complete the assignment details.
                </p>
              ) : null}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="lecturerId">Assigned lecturer</Label>
                <Select defaultValue={editCourse.lecturerId} name="lecturerId" required>
                  <SelectTrigger id="lecturerId">
                    <SelectValue />
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
                <Label htmlFor="semester">Semester</Label>
                <Input
                  defaultValue={editCourse.semester}
                  id="semester"
                  name="semester"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="academicYear">Academic year</Label>
                <Input
                  defaultValue={editCourse.academicYear}
                  id="academicYear"
                  name="academicYear"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="classGroup">Class group</Label>
                <Input
                  defaultValue={editCourse.classGroup}
                  id="classGroup"
                  name="classGroup"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue={editCourse.status} name="status">
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 pt-2">
                <Button className="w-full" type="submit">
                  Save assignment
                </Button>
              </div>
            </form>

            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-4 text-xs text-muted-foreground flex flex-col justify-between h-fit self-start">
              <div>
                <h4 className="font-extrabold text-foreground uppercase tracking-wider mb-2">Remove Assignment</h4>
                <p className="leading-relaxed">
                  Removing this assignment deletes the lecturer-course offering, including related enrolments, sessions, and resources.
                </p>
              </div>
              <form action={deleteAssignedCourseAction}>
                <input name="courseId" type="hidden" value={editCourse.id} />
                <ConfirmSubmitButton message="Delete this course assignment? This will remove related enrolments, sessions, and resources." className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8.5 rounded-lg flex items-center justify-center gap-1.5 font-bold">
                  <Trash2 className="size-3.5" />
                  <span>Delete Assignment</span>
                </ConfirmSubmitButton>
              </form>
            </div>
          </div>
        </FormModal>
      )}
    </>
  );
}
