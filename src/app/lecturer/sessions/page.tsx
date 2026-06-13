import Link from "next/link";
import { and, asc, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { Pencil, Plus, Search } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/db/client";
import { attendanceSessions, courses } from "@/db/schema";
import { requireRole } from "@/lib/auth";

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
  }>;
}) {
  const params = await searchParams;
  const user = await requireRole("lecturer");
  const db = getDb();
  const lecturerId = user.lecturerProfileId ?? "";
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

  const [lecturerCourses, rows] = await Promise.all([
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
  ]);

  return (
    <>
      <PageHeader
        title="Attendance sessions"
        description="Open sessions, generate passkeys, monitor submissions, and close attendance windows."
        actions={
          <Button asChild>
            <Link href="/lecturer/sessions/new">
              <Plus className="size-4" />
              New session
            </Link>
          </Button>
        }
      />
      <Card className="mb-6">
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
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Opens</TableHead>
                <TableHead>Final close</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">
                    <Link href={`/lecturer/courses/${session.courseId}/sessions/${session.id}`}>
                      {session.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {session.courseCode}: {session.courseTitle}
                  </TableCell>
                  <TableCell>{session.opensAt.toLocaleString()}</TableCell>
                  <TableCell>{session.finalClosesAt.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{session.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/lecturer/courses/${session.courseId}/sessions/${session.id}/edit`}
                      >
                        <Pencil className="size-4" />
                        Edit
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={6}>
                    No attendance sessions have been created yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
