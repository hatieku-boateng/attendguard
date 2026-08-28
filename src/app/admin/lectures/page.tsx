import { and, asc, desc, eq } from "drizzle-orm";
import { Clock3, Plus, QrCode } from "lucide-react";

import { createLectureAction } from "@/app/admin/lectures/actions";
import { AttendanceSessionFields } from "@/components/attendance-session-fields";
import { FormModal } from "@/components/form-modal";
import { PageHeader } from "@/components/page-header";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDb } from "@/db/client";
import {
  attendanceSessions,
  courses,
  lectureHalls,
  lecturerProfiles,
  users,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function AdminLecturesPage({
  searchParams,
}: {
  searchParams: Promise<{ modal?: string; error?: string; created?: string }>;
}) {
  await requireRole("administrator");
  const query = await searchParams;
  const db = getDb();
  const [courseOptions, venues, lectures] = await Promise.all([
    db
      .select({
        id: courses.id,
        code: courses.courseCode,
        title: courses.courseTitle,
        classGroup: courses.classGroup,
        lecturerName: users.name,
      })
      .from(courses)
      .innerJoin(lecturerProfiles, eq(courses.lecturerId, lecturerProfiles.id))
      .innerJoin(users, eq(lecturerProfiles.userId, users.id))
      .where(and(eq(courses.status, "active"), eq(users.status, "active")))
      .orderBy(asc(courses.courseCode)),
    db
      .select({ id: lectureHalls.id, code: lectureHalls.code, name: lectureHalls.name })
      .from(lectureHalls)
      .where(eq(lectureHalls.status, "active"))
      .orderBy(asc(lectureHalls.code)),
    db
      .select({
        id: attendanceSessions.id,
        title: attendanceSessions.sessionTitle,
        status: attendanceSessions.status,
        opensAt: attendanceSessions.opensAt,
        courseCode: courses.courseCode,
        courseTitle: courses.courseTitle,
        lecturerName: users.name,
        venueCode: lectureHalls.code,
      })
      .from(attendanceSessions)
      .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
      .innerJoin(lecturerProfiles, eq(attendanceSessions.lecturerId, lecturerProfiles.id))
      .innerJoin(users, eq(lecturerProfiles.userId, users.id))
      .leftJoin(lectureHalls, eq(attendanceSessions.lectureHallId, lectureHalls.id))
      .orderBy(desc(attendanceSessions.opensAt)),
  ]);

  const errorMessage =
    query.error === "time"
      ? "Opening, present-until, and final-close times must be in chronological order."
      : query.error === "course"
        ? "Select a valid course assignment with an active lecturer."
        : query.error === "venue"
          ? "Select an active lecture hall or leave the venue empty."
          : query.error
            ? "Complete all required lecture fields."
            : null;

  return (
    <>
      <PageHeader
        actions={
          <Button asChild>
            <a href="/admin/lectures?modal=new">
              <Plus className="size-4" />
              Add lecture
            </a>
          </Button>
        }
        description="Schedule lectures for assigned courses. Lecturers display the QR code and manage attendance after creation."
        title="Lectures"
      />

      {query.created ? (
        <p className="mb-5 border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          Lecture created and assigned to the course lecturer.
        </p>
      ) : null}

      <Card className="glass-panel border-border/40 overflow-hidden">
        <CardHeader className="border-b border-border/30">
          <CardTitle className="text-base">Scheduled lectures</CardTitle>
          <CardDescription>{lectures.length} lecture(s) across all assigned courses.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6">Lecture</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Lecturer</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Opens</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lectures.map((lecture) => (
                  <TableRow key={lecture.id}>
                    <TableCell className="px-6 font-bold">{lecture.title}</TableCell>
                    <TableCell><span className="block text-sm font-semibold">{lecture.courseCode}</span><span className="text-xs text-muted-foreground">{lecture.courseTitle}</span></TableCell>
                    <TableCell className="text-sm">{lecture.lecturerName}</TableCell>
                    <TableCell className="text-sm">{lecture.venueCode || "-"}</TableCell>
                    <TableCell className="text-xs">{lecture.opensAt.toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={lecture.status} /></TableCell>
                  </TableRow>
                ))}
                {lectures.length === 0 ? (
                  <TableRow><TableCell className="h-28 text-center text-sm text-muted-foreground" colSpan={6}>No lectures have been created.</TableCell></TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <div className="divide-y divide-border/30 md:hidden">
            {lectures.map((lecture) => (
              <div className="space-y-3 p-5" key={lecture.id}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-extrabold">{lecture.title}</p><p className="mt-1 text-xs text-muted-foreground">{lecture.courseCode}: {lecture.courseTitle}</p></div>
                  <StatusBadge status={lecture.status} />
                </div>
                <div className="grid grid-cols-2 gap-3 border border-border/50 bg-muted/25 p-3 text-xs">
                  <div><span className="block text-muted-foreground">Lecturer</span><strong>{lecture.lecturerName}</strong></div>
                  <div><span className="block text-muted-foreground">Venue</span><strong>{lecture.venueCode || "-"}</strong></div>
                  <div className="col-span-2"><span className="block text-muted-foreground">Opens</span><strong>{lecture.opensAt.toLocaleString()}</strong></div>
                </div>
              </div>
            ))}
            {lectures.length === 0 ? <p className="px-5 py-12 text-center text-sm text-muted-foreground">No lectures have been created.</p> : null}
          </div>
        </CardContent>
      </Card>

      <FormModal
        description="The selected course determines which lecturer receives this QR attendance session."
        isOpen={query.modal === "new"}
        title="Add lecture"
      >
        <form action={createLectureAction} className="grid gap-4 sm:grid-cols-2">
          {errorMessage ? <p className="border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs font-semibold text-destructive sm:col-span-2">{errorMessage}</p> : null}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="courseId">Assigned course</Label>
            <select className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" id="courseId" name="courseId" required>
              <option value="">Select course and lecturer</option>
              {courseOptions.map((course) => <option key={course.id} value={course.id}>{course.code}: {course.title} / {course.classGroup} / {course.lecturerName}</option>)}
            </select>
          </div>
          <AttendanceSessionFields venues={venues} />
          <div className="flex items-start gap-3 border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground sm:col-span-2">
            <QrCode className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>The lecturer can display the rotating QR code once the opening time is reached.</p>
          </div>
          <PendingSubmitButton className="sm:col-span-2" pendingLabel="Creating lecture...">
            <Clock3 className="size-4" />
            Create lecture
          </PendingSubmitButton>
        </form>
      </FormModal>
    </>
  );
}
