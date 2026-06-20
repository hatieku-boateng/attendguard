import Link from "next/link";
import { and, asc, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { Pencil, Plus, Search } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/db/client";
import { attendanceSessions, courses } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { FormModal } from "@/components/form-modal";
import { LocationFields } from "@/components/location-fields";
import { SessionLocationFields } from "@/components/session-location-fields";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAttendanceSessionAction,
  updateAttendanceSessionAction,
  deleteAttendanceSessionAction,
} from "@/app/lecturer/sessions/actions";

function toDateTimeLocalValue(date: Date) {
  return date.toISOString().slice(0, 16);
}

const statusOptions = ["draft", "open", "closed", "cancelled"] as const;

function cleanParam(value: string | undefined) {
  return String(value ?? "").trim();
}

function parseDateFilter(value: string, boundary: "start" | "end") {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T${boundary === "start" ? "00:00:00" : "23:59:59"}`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export default async function LecturerSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    courseId?: string;
    from?: string;
    to?: string;
    sort?: string;
    modal?: string;
    id?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const user = await requireRole("lecturer");
  const db = getDb();
  const lecturerId = user.lecturerProfileId ?? "";

  let editSession = null;
  if (params.modal === "edit" && params.id) {
    const [foundSession] = await db
      .select({
        id: attendanceSessions.id,
        title: attendanceSessions.sessionTitle,
        status: attendanceSessions.status,
        opensAt: attendanceSessions.opensAt,
        normalClosesAt: attendanceSessions.normalClosesAt,
        finalClosesAt: attendanceSessions.finalClosesAt,
        radius: attendanceSessions.geofenceRadiusMeters,
        maxAccuracy: attendanceSessions.maxAcceptedAccuracyMeters,
        lecturerLatitude: attendanceSessions.lecturerLatitude,
        lecturerLongitude: attendanceSessions.lecturerLongitude,
        lecturerLocationAccuracy: attendanceSessions.lecturerLocationAccuracy,
        courseId: attendanceSessions.courseId,
        courseCode: courses.courseCode,
        courseTitle: courses.courseTitle,
      })
      .from(attendanceSessions)
      .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
      .where(
        and(
          eq(attendanceSessions.id, params.id),
          eq(attendanceSessions.lecturerId, lecturerId),
        ),
      )
      .limit(1);

    if (foundSession) {
      editSession = foundSession;
    }
  }

  const errorMessages: Record<string, string> = {
    time: "Opening time must be before normal close, and normal close must be before final close.",
    "lecturer-accuracy":
      "The captured lecturer location accuracy is above the selected limit. Recapture closer to the class location or increase the limit.",
    location: "Enter a valid latitude and longitude for the lecture location.",
    missing:
      "Complete all required session fields and keep or accept the captured session location.",
  };

  const query = cleanParam(params.q);
  const status = cleanParam(params.status);
  const courseId = cleanParam(params.courseId);
  const fromDate = parseDateFilter(cleanParam(params.from), "start");
  const toDate = parseDateFilter(cleanParam(params.to), "end");
  const sort = cleanParam(params.sort) || "newest";
  const filters = [eq(attendanceSessions.lecturerId, lecturerId)];

  if (query) {
    const searchFilter = or(
      ilike(attendanceSessions.sessionTitle, `%${query}%`),
      ilike(courses.courseCode, `%${query}%`),
      ilike(courses.courseTitle, `%${query}%`),
    );

    if (searchFilter) {
      filters.push(searchFilter);
    }
  }

  if (statusOptions.includes(status as (typeof statusOptions)[number])) {
    filters.push(eq(attendanceSessions.status, status as (typeof statusOptions)[number]));
  }

  if (courseId) {
    filters.push(eq(attendanceSessions.courseId, courseId));
  }

  if (fromDate) {
    filters.push(gte(attendanceSessions.opensAt, fromDate));
  }

  if (toDate) {
    filters.push(lte(attendanceSessions.opensAt, toDate));
  }

  const sortOrder =
    sort === "oldest"
      ? [asc(attendanceSessions.opensAt)]
      : sort === "title"
        ? [asc(attendanceSessions.sessionTitle)]
        : sort === "status"
          ? [asc(attendanceSessions.status), desc(attendanceSessions.opensAt)]
          : [desc(attendanceSessions.opensAt)];

  const [lecturerCourses, rows, reusableLocationRows] = await Promise.all([
    db
      .select({
        id: courses.id,
        code: courses.courseCode,
        title: courses.courseTitle,
      })
      .from(courses)
      .where(eq(courses.lecturerId, lecturerId))
      .orderBy(asc(courses.courseCode)),
    db
      .select({
        id: attendanceSessions.id,
        courseId: attendanceSessions.courseId,
        title: attendanceSessions.sessionTitle,
        status: attendanceSessions.status,
        opensAt: attendanceSessions.opensAt,
        finalClosesAt: attendanceSessions.finalClosesAt,
        courseCode: courses.courseCode,
        courseTitle: courses.courseTitle,
      })
      .from(attendanceSessions)
      .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
      .where(and(...filters))
      .orderBy(...sortOrder),
    db
      .select({
        id: attendanceSessions.id,
        title: attendanceSessions.sessionTitle,
        opensAt: attendanceSessions.opensAt,
        lecturerLatitude: attendanceSessions.lecturerLatitude,
        lecturerLongitude: attendanceSessions.lecturerLongitude,
        lecturerLocationAccuracy: attendanceSessions.lecturerLocationAccuracy,
        geofenceRadiusMeters: attendanceSessions.geofenceRadiusMeters,
        maxAcceptedAccuracyMeters: attendanceSessions.maxAcceptedAccuracyMeters,
        courseCode: courses.courseCode,
      })
      .from(attendanceSessions)
      .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
      .where(eq(attendanceSessions.lecturerId, lecturerId))
      .orderBy(desc(attendanceSessions.opensAt)),
  ]);
  const previousSessionLocations = reusableLocationRows.map((session) => ({
    id: session.id,
    title: session.title,
    opensAtLabel: session.opensAt.toLocaleString(),
    latitude: session.lecturerLatitude,
    longitude: session.lecturerLongitude,
    accuracy: session.lecturerLocationAccuracy ?? "",
    courseLabel: session.courseCode,
    radiusMeters: session.geofenceRadiusMeters,
    maxAccuracyMeters: session.maxAcceptedAccuracyMeters,
  }));

  return (
    <>
      <PageHeader
        title="Attendance sessions"
        description="Open sessions, generate passkeys, monitor submissions, and close attendance windows."
        actions={
          <Button asChild>
            <Link href="/lecturer/sessions?modal=new">
              <Plus className="size-4" />
              New session
            </Link>
          </Button>
        }
      />
      <Card className="glass-panel glass-panel-hover overflow-hidden relative border-border/40 mb-6">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
        <CardContent className="pt-6">
          <form className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="q">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-2 size-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  defaultValue={query}
                  id="q"
                  name="q"
                  placeholder="Session, course code, or title"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                className="h-9 w-full rounded-lg border border-input bg-card/80 px-3 text-sm shadow-sm shadow-slate-950/5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/45"
                defaultValue={status}
                id="status"
                name="status"
              >
                <option value="">All statuses</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseId">Course</Label>
              <select
                className="h-9 w-full rounded-lg border border-input bg-card/80 px-3 text-sm shadow-sm shadow-slate-950/5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/45"
                defaultValue={courseId}
                id="courseId"
                name="courseId"
              >
                <option value="">All courses</option>
                {lecturerCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input defaultValue={cleanParam(params.from)} id="from" name="from" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input defaultValue={cleanParam(params.to)} id="to" name="to" type="date" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <select
                aria-label="Sort sessions"
                className="h-9 w-full rounded-lg border border-input bg-card/80 px-3 text-sm shadow-sm shadow-slate-950/5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/45"
                defaultValue={sort}
                name="sort"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title">Title</option>
                <option value="status">Status</option>
              </select>
              <div className="flex gap-2">
                <Button className="flex-1" type="submit">
                  Filter
                </Button>
                <Button asChild className="flex-1" variant="outline">
                  <Link href="/lecturer/sessions">Clear</Link>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className="glass-panel border-border/40 overflow-hidden relative">
        <CardContent className="pt-0 px-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-950/[0.02] dark:bg-white/[0.01]">
                <TableRow className="hover:bg-transparent border-b border-border/30">
                  <TableHead className="px-6 py-3 font-semibold text-muted-foreground text-xs">Session</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Course</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Opens</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Final close</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Status</TableHead>
                  <TableHead className="px-6 py-3 text-right font-semibold text-muted-foreground text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((session) => (
                  <TableRow key={session.id} className="hover:bg-muted/30 border-b border-border/20 transition-colors">
                    <TableCell className="px-6 py-4.5">
                      <Link href={`/lecturer/courses/${session.courseId}/sessions/${session.id}`} className="font-extrabold text-foreground text-sm hover:underline">
                        {session.title}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-bold text-foreground/80">
                      <span className="font-extrabold text-foreground">{session.courseCode}</span>: {session.courseTitle}
                    </TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">{session.opensAt.toLocaleString()}</TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">{session.finalClosesAt.toLocaleString()}</TableCell>
                    <TableCell className="px-4 py-4.5">
                      <StatusBadge status={session.status} />
                    </TableCell>
                    <TableCell className="px-6 py-4.5 text-right">
                      <Button asChild size="sm" variant="outline" className="h-8.5 rounded-lg text-xs font-bold shadow-sm">
                        <Link
                          href={`/lecturer/sessions?modal=edit&id=${session.id}`}
                          className="flex items-center gap-1.5"
                        >
                          <Pencil className="size-3.5" />
                          <span>Edit</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-24 text-center text-muted-foreground text-xs font-semibold" colSpan={6}>
                      No attendance sessions have been created yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border/20">
            {rows.map((session) => (
              <div key={session.id} className="p-5 flex flex-col gap-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <Link href={`/lecturer/courses/${session.courseId}/sessions/${session.id}`} className="text-sm font-extrabold text-primary hover:underline leading-snug">
                      {session.title}
                    </Link>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 leading-relaxed">
                      {session.courseCode}: {session.courseTitle}
                    </p>
                  </div>
                  <StatusBadge status={session.status} />
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-950/[0.015] dark:bg-white/[0.015] p-3 rounded-xl border border-border/25">
                  <div>
                    <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Opens</span>
                    <span className="font-bold text-foreground/80 mt-0.5 block">{session.opensAt.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Final Close</span>
                    <span className="font-bold text-foreground/80 mt-0.5 block">{session.finalClosesAt.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button asChild size="sm" variant="outline" className="h-8.5 rounded-lg text-xs font-bold shadow-sm w-full">
                    <Link href={`/lecturer/sessions?modal=edit&id=${session.id}`} className="flex items-center justify-center gap-1.5">
                      <Pencil className="size-3.5" />
                      <span>Edit Session</span>
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 px-6">
                <p className="text-center text-muted-foreground text-sm font-semibold">No attendance sessions found.</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* New Session Modal */}
      <FormModal
        isOpen={params.modal === "new"}
        title="New attendance session"
        description="Capture the lecture location, set the attendance radius, and define normal and final closing times."
        className="sm:max-w-2xl"
      >
        <form action={createAttendanceSessionAction} className="grid gap-4 sm:grid-cols-2 pt-2">
          {params.error && errorMessages[params.error] ? (
            <p className="sm:col-span-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed">
              {errorMessages[params.error]}
            </p>
          ) : null}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="courseId" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Course</Label>
            <Select name="courseId" required defaultValue={params.courseId}>
              <SelectTrigger id="courseId">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {lecturerCourses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code}: {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sessionTitle" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Session title</Label>
            <Input id="sessionTitle" name="sessionTitle" required placeholder="e.g. Week 1 Lecture" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="geofenceRadiusMeters" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Attendance radius</Label>
            <Input
              defaultValue={30}
              id="geofenceRadiusMeters"
              min={10}
              name="geofenceRadiusMeters"
              required
              type="number"
            />
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Students outside this distance from the captured lecture location are flagged or rejected.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxAcceptedAccuracyMeters" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">GPS accuracy limit</Label>
            <Input
              defaultValue={50}
              id="maxAcceptedAccuracyMeters"
              min={10}
              name="maxAcceptedAccuracyMeters"
              required
              type="number"
            />
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              The lecturer and students must have GPS accuracy within this range in metres.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="opensAt" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opens at</Label>
            <Input id="opensAt" name="opensAt" required type="datetime-local" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="normalClosesAt" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Normal closes at</Label>
            <Input id="normalClosesAt" name="normalClosesAt" required type="datetime-local" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="finalClosesAt" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Final closes at</Label>
            <Input id="finalClosesAt" name="finalClosesAt" required type="datetime-local" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lecturer location</Label>
            <SessionLocationFields
              accuracyName="lecturerLocationAccuracy"
              latitudeName="lecturerLatitude"
              longitudeName="lecturerLongitude"
              maxAccuracyInputId="maxAcceptedAccuracyMeters"
              previousLocations={previousSessionLocations}
              radiusInputId="geofenceRadiusMeters"
            />
          </div>
          <div className="sm:col-span-2 pt-2">
            <Button className="w-full py-5 rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg text-sm" type="submit">
              Open attendance session
            </Button>
          </div>
        </form>
      </FormModal>

      {/* Edit Session Modal */}
      {editSession && (
        <FormModal
          isOpen={params.modal === "edit" && !!editSession}
          title="Edit attendance session"
          description={`${editSession.courseCode}: ${editSession.courseTitle}`}
          className="sm:max-w-4xl"
        >
          <div className="grid gap-6 pt-2 lg:grid-cols-[1fr_320px]">
            <Card className="border-0 shadow-none bg-transparent">
              <CardContent className="p-0">
                <form action={updateAttendanceSessionAction} className="grid gap-4 sm:grid-cols-2">
                  <input name="sessionId" type="hidden" value={editSession.id} />
                  {params.error && errorMessages[params.error] ? (
                    <p className="sm:col-span-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed">
                      {errorMessages[params.error]}
                    </p>
                  ) : null}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Course</Label>
                    <div className="rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground font-semibold">
                      {editSession.courseCode}: {editSession.courseTitle}
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 font-medium leading-relaxed">
                      Course ownership is fixed for an existing session.
                    </p>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="sessionTitle" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Session title</Label>
                    <Input
                      defaultValue={editSession.title}
                      id="sessionTitle"
                      name="sessionTitle"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="geofenceRadiusMeters" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Attendance radius</Label>
                    <Input
                      defaultValue={editSession.radius}
                      id="geofenceRadiusMeters"
                      min={10}
                      name="geofenceRadiusMeters"
                      required
                      type="number"
                    />
                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                      Students outside this distance from the captured lecture location are flagged or rejected.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="maxAcceptedAccuracyMeters" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">GPS accuracy limit</Label>
                    <Input
                      defaultValue={editSession.maxAccuracy}
                      id="maxAcceptedAccuracyMeters"
                      min={10}
                      name="maxAcceptedAccuracyMeters"
                      required
                      type="number"
                    />
                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                      The lecturer and students must have GPS accuracy within this range in metres.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="opensAt" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opens at</Label>
                    <Input
                      defaultValue={toDateTimeLocalValue(editSession.opensAt)}
                      id="opensAt"
                      name="opensAt"
                      required
                      type="datetime-local"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="normalClosesAt" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Normal closes at</Label>
                    <Input
                      defaultValue={toDateTimeLocalValue(editSession.normalClosesAt)}
                      id="normalClosesAt"
                      name="normalClosesAt"
                      required
                      type="datetime-local"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="finalClosesAt" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Final closes at</Label>
                    <Input
                      defaultValue={toDateTimeLocalValue(editSession.finalClosesAt)}
                      id="finalClosesAt"
                      name="finalClosesAt"
                      required
                      type="datetime-local"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lecturer location</Label>
                    <LocationFields
                      accuracyName="lecturerLocationAccuracy"
                      allowManualEntry
                      initialAccuracy={editSession.lecturerLocationAccuracy}
                      initialLatitude={editSession.lecturerLatitude}
                      initialLongitude={editSession.lecturerLongitude}
                      latitudeName="lecturerLatitude"
                      longitudeName="lecturerLongitude"
                      maxAccuracyInputId="maxAcceptedAccuracyMeters"
                      requireAcceptance
                    />
                  </div>
                  <div className="sm:col-span-2 pt-2">
                    <Button className="w-full py-5 rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg text-sm" type="submit">Save session changes</Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border-destructive/20 bg-destructive/5 dark:bg-destructive/2 h-fit self-start">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-destructive">Delete session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-muted-foreground">
                <p className="leading-relaxed">
                  Deleting this session removes its passkeys, attendance records, and review attempts.
                </p>
                <form action={deleteAttendanceSessionAction}>
                  <input name="sessionId" type="hidden" value={editSession.id} />
                  <ConfirmSubmitButton message="Delete this attendance session? This will remove related passkeys, attendance records, and attempts." className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8.5 rounded-lg flex items-center justify-center gap-1.5 font-bold">
                    Delete session
                  </ConfirmSubmitButton>
                </form>
              </CardContent>
            </Card>
          </div>
        </FormModal>
      )}
    </>
  );
}
