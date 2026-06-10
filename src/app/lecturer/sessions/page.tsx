import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";

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
import { getDb } from "@/db/client";
import { attendanceSessions, courses } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function LecturerSessionsPage() {
  const user = await requireRole(["lecturer", "administrator"]);
  const db = getDb();

  const rows = await db
    .select({
      id: attendanceSessions.id,
      title: attendanceSessions.sessionTitle,
      status: attendanceSessions.status,
      opensAt: attendanceSessions.opensAt,
      finalClosesAt: attendanceSessions.finalClosesAt,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
    })
    .from(attendanceSessions)
    .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
    .where(eq(attendanceSessions.lecturerId, user.lecturerProfileId ?? ""))
    .orderBy(desc(attendanceSessions.opensAt));

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">
                    <Link href={`/lecturer/sessions/${session.id}`}>
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
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={5}>
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
