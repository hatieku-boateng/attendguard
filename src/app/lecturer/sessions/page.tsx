import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Pencil, QrCode } from "lucide-react";

import { deleteAttendanceSessionAction, updateAttendanceSessionAction } from "@/app/lecturer/sessions/actions";
import { AttendanceSessionFields } from "@/components/attendance-session-fields";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { FormModal } from "@/components/form-modal";
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
import { attendanceSessions, courses, lectureHalls } from "@/db/schema";
import { requireRole } from "@/lib/auth";

type SearchParams = {
  modal?: string;
  id?: string;
  error?: string;
  q?: string;
  status?: string;
  courseId?: string;
};

function toDateTimeLocalValue(date: Date) {
  return date.toISOString().slice(0, 16);
}

export default async function LecturerSessionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const user = await requireRole("lecturer");
  const lecturerId = user.lecturerProfileId ?? "";
  const db = getDb();

  const [venues, allSessions] = await Promise.all([
    db
      .select({ id: lectureHalls.id, code: lectureHalls.code, name: lectureHalls.name })
      .from(lectureHalls)
      .where(eq(lectureHalls.status, "active"))
      .orderBy(lectureHalls.code),
    db
      .select({
        id: attendanceSessions.id,
        title: attendanceSessions.sessionTitle,
        status: attendanceSessions.status,
        opensAt: attendanceSessions.opensAt,
        normalClosesAt: attendanceSessions.normalClosesAt,
        finalClosesAt: attendanceSessions.finalClosesAt,
        lectureHallId: attendanceSessions.lectureHallId,
        courseId: courses.id,
        courseCode: courses.courseCode,
        courseTitle: courses.courseTitle,
      })
      .from(attendanceSessions)
      .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
      .where(eq(attendanceSessions.lecturerId, lecturerId))
      .orderBy(desc(attendanceSessions.opensAt)),
  ]);

  const query = params.q?.trim().toLowerCase() ?? "";
  const rows = allSessions.filter((session) => {
    const matchesQuery =
      !query ||
      session.title.toLowerCase().includes(query) ||
      session.courseCode.toLowerCase().includes(query) ||
      session.courseTitle.toLowerCase().includes(query);
    const matchesStatus = !params.status || session.status === params.status;
    return matchesQuery && matchesStatus;
  });

  const editSession =
    params.modal === "edit" && params.id
      ? allSessions.find((session) => session.id === params.id)
      : undefined;
  const errorMessage =
    params.error === "time"
      ? "Opening time must be before present-until time, and present-until must not exceed final close."
      : params.error
        ? "Complete the session title and attendance times, then select a valid venue."
        : null;

  return (
    <>
      <PageHeader
        description="Manage administrator-created QR attendance windows and monitor student check-ins."
        title="Attendance sessions"
      />

      <Card className="mb-5 border-border/50">
        <CardContent className="pt-6">
          <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]" method="get">
            <Input defaultValue={params.q ?? ""} name="q" placeholder="Search sessions or courses" />
            <select className="h-9 rounded-lg border border-input bg-card px-3 text-sm" defaultValue={params.status ?? ""} name="status">
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Button type="submit" variant="outline">Filter</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/50">
        <CardContent className="px-0 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6">Session</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Attendance window</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="px-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="px-6 font-bold text-foreground">{session.title}</TableCell>
                  <TableCell>
                    <span className="font-bold">{session.courseCode}</span>
                    <span className="block text-xs text-muted-foreground">{session.courseTitle}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {session.opensAt.toLocaleString()}
                    <span className="block">to {session.finalClosesAt.toLocaleString()}</span>
                  </TableCell>
                  <TableCell><StatusBadge status={session.status} /></TableCell>
                  <TableCell className="px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm">
                        <Link href={`/lecturer/sessions/${session.id}`}>
                          <QrCode className="size-4" />
                          Manage
                        </Link>
                      </Button>
                      <Button asChild aria-label={`Edit ${session.title}`} size="icon" title="Edit session" variant="outline">
                        <Link href={`/lecturer/sessions?modal=edit&id=${session.id}`}>
                          <Pencil className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow><TableCell className="h-32 text-center text-muted-foreground" colSpan={5}>No attendance sessions match this view.</TableCell></TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editSession ? (
        <FormModal description={`${editSession.courseCode}: ${editSession.courseTitle}`} isOpen title="Edit attendance session">
          <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
            <form action={updateAttendanceSessionAction} className="grid gap-4 sm:grid-cols-2">
              <input name="sessionId" type="hidden" value={editSession.id} />
              {errorMessage ? <ErrorMessage message={errorMessage} /> : null}
              <AttendanceSessionFields
                defaults={{
                  title: editSession.title,
                  lectureHallId: editSession.lectureHallId,
                  opensAt: toDateTimeLocalValue(editSession.opensAt),
                  normalClosesAt: toDateTimeLocalValue(editSession.normalClosesAt),
                  finalClosesAt: toDateTimeLocalValue(editSession.finalClosesAt),
                }}
                venues={venues}
              />
              <Button className="sm:col-span-2" type="submit">Save changes</Button>
            </form>
            <div className="h-fit border border-destructive/25 bg-destructive/5 p-4">
              <p className="text-sm font-bold text-destructive">Delete session</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">This removes its attendance records and scan activity.</p>
              <form action={deleteAttendanceSessionAction} className="mt-4">
                <input name="sessionId" type="hidden" value={editSession.id} />
                <ConfirmSubmitButton className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90" message="Delete this attendance session?">Delete</ConfirmSubmitButton>
              </form>
            </div>
          </div>
        </FormModal>
      ) : null}
    </>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs font-semibold text-destructive sm:col-span-2">{message}</p>;
}
