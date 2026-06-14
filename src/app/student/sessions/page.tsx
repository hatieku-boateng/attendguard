import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { Clock } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
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
import {
  attendancePasskeys,
  attendanceRecords,
  attendanceSessions,
  courses,
  enrolments,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { decryptPasskey } from "@/lib/passkeys";

export default async function StudentSessionsPage() {
  const user = await requireRole("student");
  const db = getDb();
  const studentId = user.studentProfileId ?? "";

  const activeEnrolments = await db
    .select({ courseId: enrolments.courseId })
    .from(enrolments)
    .where(and(eq(enrolments.studentId, studentId), eq(enrolments.status, "active")));
  const courseIds = activeEnrolments.map((enrolment) => enrolment.courseId);

  const rows = courseIds.length
    ? await db
        .select({
          id: attendanceSessions.id,
          title: attendanceSessions.sessionTitle,
          opensAt: attendanceSessions.opensAt,
          normalClosesAt: attendanceSessions.normalClosesAt,
          finalClosesAt: attendanceSessions.finalClosesAt,
          status: attendanceSessions.status,
          courseCode: courses.courseCode,
          courseTitle: courses.courseTitle,
          passkeyCiphertext: attendancePasskeys.passkeyCiphertext,
          recordId: attendanceRecords.id,
        })
        .from(attendanceSessions)
        .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
        .leftJoin(
          attendancePasskeys,
          and(
            eq(attendancePasskeys.sessionId, attendanceSessions.id),
            eq(attendancePasskeys.studentId, studentId),
          ),
        )
        .leftJoin(
          attendanceRecords,
          and(
            eq(attendanceRecords.sessionId, attendanceSessions.id),
            eq(attendanceRecords.studentId, studentId),
          ),
        )
        .where(
          and(
            inArray(attendanceSessions.courseId, courseIds),
            eq(attendanceSessions.status, "open"),
          ),
        )
    : [];

  return (
    <>
      <PageHeader
        title="Active Sessions"
        description="View and verify attendance for geofenced sessions currently active in your registered classes."
      />
      <Card className="glass-panel glass-panel-hover overflow-hidden relative border-border/40">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <CardContent className="pt-6 px-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-950/[0.02] dark:bg-white/[0.01]">
                <TableRow className="hover:bg-transparent border-b border-border/30">
                  <TableHead className="px-6 py-3 font-semibold text-muted-foreground text-xs">Session</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Course</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Final Close</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Passkey</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Status</TableHead>
                  <TableHead className="px-6 py-3 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((session) => {
                  const passkey = decryptPasskey(session.passkeyCiphertext);
                  const isCompleted = Boolean(session.recordId);

                  return (
                    <TableRow key={session.id} className="hover:bg-muted/30 border-b border-border/20 transition-colors">
                      <TableCell className="px-6 py-4.5 font-bold text-foreground text-sm">{session.title}</TableCell>
                      <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">
                        <span className="font-extrabold text-foreground">{session.courseCode}</span>: {session.courseTitle}
                      </TableCell>
                      <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">
                        {session.finalClosesAt.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-4 py-4.5">
                        {passkey ? (
                          <code className="px-2.5 py-1 rounded bg-muted font-mono text-xs text-foreground font-bold border border-border/40">
                            {passkey}
                          </code>
                        ) : (
                          <span className="text-xs text-muted-foreground/50 font-medium">Pending</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-4.5">
                        <StatusBadge status={isCompleted ? "present" : session.status} />
                      </TableCell>
                      <TableCell className="px-6 py-4.5 text-right">
                        <Button asChild size="sm" disabled={!passkey || isCompleted} className="h-9 rounded-xl text-xs font-bold shadow-sm">
                          <Link href={`/student/check-in/${session.id}`}>Check in</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-44 text-center text-muted-foreground text-xs" colSpan={6}>
                      <div className="flex flex-col items-center justify-center gap-3 py-6">
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground/35 animate-pulse">
                          <Clock className="size-6" />
                        </span>
                        <p className="font-semibold text-muted-foreground/60 text-sm">No active sessions are open.</p>
                        <p className="text-[0.68rem] text-muted-foreground/40 max-w-xs leading-relaxed">Attendance checking sessions will appear here as soon as they are launched.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border/20">
            {rows.map((session) => {
              const passkey = decryptPasskey(session.passkeyCiphertext);
              const isCompleted = Boolean(session.recordId);

              return (
                <div key={session.id} className="p-5 flex flex-col gap-3.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-extrabold text-foreground leading-snug">{session.title}</span>
                      <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 leading-relaxed">
                        {session.courseCode}: {session.courseTitle}
                      </p>
                    </div>
                    <StatusBadge status={isCompleted ? "present" : session.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-950/[0.015] dark:bg-white/[0.015] p-3 rounded-xl border border-border/25">
                    <div>
                      <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Final Close</span>
                      <span className="font-bold text-foreground/80 mt-0.5 block">{session.finalClosesAt.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Passkey</span>
                      <div className="mt-0.5">
                        {passkey ? (
                          <code className="px-2 py-0.5 rounded bg-muted font-mono text-xs text-foreground font-extrabold border border-border/40">
                            {passkey}
                          </code>
                        ) : (
                          <span className="text-xs text-muted-foreground/50 font-medium">Pending</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button asChild size="sm" disabled={!passkey || isCompleted} className="h-9 rounded-xl text-xs font-bold shadow-sm w-full">
                      <Link href={`/student/check-in/${session.id}`} className="justify-center">Check in</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 px-6">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground/35">
                  <Clock className="size-6" />
                </span>
                <p className="font-semibold text-muted-foreground/60 text-sm">No active sessions are open.</p>
                <p className="text-[0.68rem] text-muted-foreground/40 max-w-xs leading-relaxed text-center">Attendance checking sessions will appear here as soon as they are launched.</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
