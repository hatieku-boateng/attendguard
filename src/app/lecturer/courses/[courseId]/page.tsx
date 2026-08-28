import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";

import {
  addCourseResourceAction,
  deleteCourseResourceAction,
  updateCourseStatusAction,
} from "@/app/lecturer/courses/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { AttendanceSessionFields } from "@/components/attendance-session-fields";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
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
  courseResources,
  courses,
  enrolments,
  lectureHalls,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { FormModal } from "@/components/form-modal";
import { createAttendanceSessionAction } from "@/app/lecturer/sessions/actions";

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ modal?: string; error?: string }>;
}) {
  const { courseId } = await params;
  const query = await searchParams;
  const user = await requireRole("lecturer");
  const db = getDb();

  const errorMessages: Record<string, string> = {
    time: "Opening time must be before normal close, and normal close must be before final close.",
    venue: "Select a valid lecture hall or leave the venue blank.",
    missing: "Complete the session title and attendance times.",
  };

  const [course] = await db
    .select()
    .from(courses)
    .where(
      and(
        eq(courses.id, courseId),
        eq(courses.lecturerId, user.lecturerProfileId ?? ""),
      ),
    )
    .limit(1);

  if (!course) {
    return <PageHeader title="Course not found" />;
  }

  const [studentCount] = await db
    .select({ value: count() })
    .from(enrolments)
    .where(eq(enrolments.courseId, course.id));

  const [sessionCount] = await db
    .select({ value: count() })
    .from(attendanceSessions)
    .where(eq(attendanceSessions.courseId, course.id));
  const resources = await db
    .select()
    .from(courseResources)
    .where(eq(courseResources.courseId, course.id));
  const sessions = await db
    .select({
      id: attendanceSessions.id,
      title: attendanceSessions.sessionTitle,
      status: attendanceSessions.status,
      opensAt: attendanceSessions.opensAt,
      finalClosesAt: attendanceSessions.finalClosesAt,
    })
    .from(attendanceSessions)
    .where(eq(attendanceSessions.courseId, course.id))
    .orderBy(desc(attendanceSessions.opensAt));
  const mappedLectureHalls = await db
    .select()
    .from(lectureHalls)
    .where(eq(lectureHalls.status, "active"))
    .orderBy(lectureHalls.code);
  const sessionVenues = mappedLectureHalls.map((hall) => ({
    id: hall.id,
    code: hall.code,
    name: hall.name,
  }));

  return (
    <>
      <PageHeader
        title={`${course.courseCode}: ${course.courseTitle}`}
        description={`${course.academicYear} / ${course.semester} / ${course.classGroup}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/lecturer/courses/${course.id}/students`}>Students</Link>
            </Button>
            <Button asChild>
              <Link href={`/lecturer/courses/${course.id}?modal=new`}>
                Start session
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Students enrolled" value={studentCount.value} />
        <StatCard label="Attendance sessions" value={sessionCount.value} />
        <StatCard label="Status" value={course.status} />
      </div>
      <Card className="mt-6 glass-panel glass-panel-hover overflow-hidden relative border-border/40">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
        <CardHeader className="border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01] pb-4">
          <CardTitle className="text-base font-bold text-foreground">Course details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-xs font-semibold text-muted-foreground/80 sm:grid-cols-2 pt-6">
          <p>
            <span className="text-muted-foreground/60 block text-[10px] font-black uppercase tracking-wider mb-1">Programme</span>
            <span className="text-sm font-bold text-foreground">{course.programme || "Not set"}</span>
          </p>
          <p>
            <span className="text-muted-foreground/60 block text-[10px] font-black uppercase tracking-wider mb-1">Level</span>
            <span className="text-sm font-bold text-foreground">{course.level || "Not set"}</span>
          </p>
          <p>
            <span className="text-muted-foreground/60 block text-[10px] font-black uppercase tracking-wider mb-1">Class group</span>
            <span className="text-sm font-bold text-foreground">{course.classGroup}</span>
          </p>
          <p>
            <span className="text-muted-foreground/60 block text-[10px] font-black uppercase tracking-wider mb-1">Current status</span>
            <span className="block mt-0.5"><StatusBadge status={course.status} /></span>
          </p>
          <form action={updateCourseStatusAction} className="flex gap-2 sm:col-span-2 pt-2">
            <input name="courseId" type="hidden" value={course.id} />
            <Button name="status" type="submit" value="active" variant="outline" className="h-8.5 rounded-lg text-xs font-bold shadow-sm">
              Mark active
            </Button>
            <Button name="status" type="submit" value="archived" variant="outline" className="h-8.5 rounded-lg text-xs font-bold shadow-sm">
              Archive
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="mt-6 glass-panel border-border/40 overflow-hidden relative" id="sessions">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 to-indigo-500" />
        <CardHeader className="border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01] pb-4">
          <CardTitle className="text-base font-bold text-foreground">Attendance sessions</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-0">
          <Table>
            <TableHeader className="bg-slate-950/[0.02] dark:bg-white/[0.01]">
              <TableRow className="hover:bg-transparent border-b border-border/30">
                <TableHead className="px-6 py-3 font-semibold text-muted-foreground text-xs">Session</TableHead>
                <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Opens</TableHead>
                <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Final close</TableHead>
                <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Status</TableHead>
                <TableHead className="px-6 py-3 text-right font-semibold text-muted-foreground text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id} className="hover:bg-muted/30 border-b border-border/20 transition-colors">
                  <TableCell className="px-6 py-4.5 font-extrabold text-foreground text-sm">
                    <Link
                      className="hover:text-primary transition-colors hover:underline"
                      href={`/lecturer/courses/${course.id}/sessions/${session.id}`}
                    >
                      {session.title}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">{session.opensAt.toLocaleString()}</TableCell>
                  <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">{session.finalClosesAt.toLocaleString()}</TableCell>
                  <TableCell className="px-4 py-4.5">
                    <StatusBadge status={session.status} />
                  </TableCell>
                  <TableCell className="px-6 py-4.5 text-right">
                    <Button asChild size="sm" variant="outline" className="h-8.5 rounded-lg text-xs font-bold shadow-sm">
                      <Link
                        href={`/lecturer/courses/${course.id}/sessions/${session.id}`}
                      >
                        Manage
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="h-24 text-center text-muted-foreground text-xs font-semibold"
                    colSpan={5}
                  >
                    No attendance sessions have been created for this course.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className="mt-6 glass-panel border-border/40 overflow-hidden relative" id="resources">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <CardHeader className="border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01] pb-4">
          <CardTitle className="text-base font-bold text-foreground">Course resources</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1fr_360px] pt-6">
          <div className="space-y-4">
            {resources.map((resource) => (
              <div className="rounded-xl border border-border/40 bg-card/30 p-5 hover:border-primary/30 transition-all" key={resource.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-extrabold text-foreground text-sm">{resource.title}</p>
                    <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/10">
                      {resource.resourceType}
                    </span>
                    {resource.description ? (
                      <p className="mt-2.5 text-xs text-muted-foreground/80 leading-relaxed font-semibold">
                        {resource.description}
                      </p>
                    ) : null}
                    <a
                      className="mt-3.5 inline-flex items-center gap-1 text-xs font-extrabold text-primary hover:underline"
                      href={resource.resourceUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open resource &rarr;
                    </a>
                  </div>
                  <form action={deleteCourseResourceAction}>
                    <input name="courseId" type="hidden" value={course.id} />
                    <input name="resourceId" type="hidden" value={resource.id} />
                    <ConfirmSubmitButton
                      message="Delete this course resource?"
                      variant="outline"
                      className="h-8.5 rounded-lg text-xs font-bold shadow-sm"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>
            ))}
            {resources.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 px-6 py-10 text-center text-xs font-semibold text-muted-foreground">
                No course resources have been added yet.
              </div>
            ) : null}
          </div>
          <form action={addCourseResourceAction} className="grid gap-4 rounded-xl border border-border/40 bg-card/30 p-5 h-fit">
            <input name="courseId" type="hidden" value={course.id} />
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resource title</Label>
              <Input id="title" name="title" placeholder="Course outline" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resourceType" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</Label>
              <Select defaultValue="outline" name="resourceType">
                <SelectTrigger id="resourceType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="slides">Slides</SelectItem>
                  <SelectItem value="reading">Reading</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resourceUrl" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resource URL</Label>
              <Input
                id="resourceUrl"
                name="resourceUrl"
                placeholder="https://..."
                required
                type="url"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>
            <Button type="submit" className="w-full mt-2 font-bold shadow-sm">Add resource</Button>
          </form>
        </CardContent>
      </Card>

      {/* Start Session Modal */}
      <FormModal
        isOpen={query.modal === "new"}
        title="Start attendance session"
        description="Choose the attendance window. The rotating QR becomes available automatically."
        className="sm:max-w-2xl"
      >
        <form action={createAttendanceSessionAction} className="grid gap-4 sm:grid-cols-2 pt-2">
          <input name="courseId" type="hidden" value={course.id} />
          <input name="source" type="hidden" value="course" />
          {query.error && errorMessages[query.error] ? (
            <p className="sm:col-span-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed">
              {errorMessages[query.error]}
            </p>
          ) : null}
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Course</Label>
            <div className="rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground font-semibold">
              {course.courseCode}: {course.courseTitle}
            </div>
          </div>
          <AttendanceSessionFields venues={sessionVenues} />
          <div className="sm:col-span-2 pt-2">
            <Button className="w-full py-5 rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg text-sm" type="submit">
              Open attendance session
            </Button>
          </div>
        </form>
      </FormModal>
    </>
  );
}
