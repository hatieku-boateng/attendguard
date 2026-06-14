import { eq } from "drizzle-orm";
import { History } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
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
import { attendanceRecords, attendanceSessions, courses } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function AttendanceHistoryPage() {
  const user = await requireRole("student");
  const db = getDb();

  const rows = await db
    .select({
      id: attendanceRecords.id,
      status: attendanceRecords.status,
      checkInAt: attendanceRecords.checkInAt,
      distance: attendanceRecords.calculatedDistanceMeters,
      courseCode: courses.courseCode,
      courseTitle: courses.courseTitle,
      sessionTitle: attendanceSessions.sessionTitle,
    })
    .from(attendanceRecords)
    .innerJoin(attendanceSessions, eq(attendanceRecords.sessionId, attendanceSessions.id))
    .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
    .where(eq(attendanceRecords.studentId, user.studentProfileId ?? ""));

  return (
    <>
      <PageHeader
        title="Attendance History"
        description="Review all recorded attendance logs linked to your student profile, including geofence distance offsets."
      />
      <Card className="glass-panel glass-panel-hover overflow-hidden relative border-border/40">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
        <CardContent className="pt-6 px-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-950/[0.02] dark:bg-white/[0.01]">
                <TableRow className="hover:bg-transparent border-b border-border/30">
                  <TableHead className="px-6 py-3 font-semibold text-muted-foreground text-xs">Course</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Session</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Status</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-xs">Check-in Time</TableHead>
                  <TableHead className="px-6 py-3 text-right font-semibold text-muted-foreground text-xs">Distance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/30 border-b border-border/20 transition-colors">
                    <TableCell className="px-6 py-4.5 font-bold text-foreground text-sm">
                      <span className="font-extrabold text-foreground">{record.courseCode}</span>
                      <span className="block text-[0.7rem] text-muted-foreground font-semibold mt-1">{record.courseTitle}</span>
                    </TableCell>
                    <TableCell className="px-4 py-4.5 font-semibold text-foreground/80 text-xs">{record.sessionTitle}</TableCell>
                    <TableCell className="px-4 py-4.5">
                      <StatusBadge status={record.status} />
                    </TableCell>
                    <TableCell className="px-4 py-4.5 text-xs font-semibold text-muted-foreground">
                      {record.checkInAt.toLocaleString()}
                    </TableCell>
                    <TableCell className="px-6 py-4.5 text-right font-mono text-xs text-foreground font-bold">
                      {record.distance !== null && record.distance !== undefined ? (
                        <span className="px-2 py-0.5 rounded bg-muted border border-border/40 text-muted-foreground">
                          {parseFloat(record.distance).toFixed(1)}m
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 font-medium">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-44 text-center text-muted-foreground text-xs" colSpan={5}>
                      <div className="flex flex-col items-center justify-center gap-3 py-6">
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground/35 animate-pulse">
                          <History className="size-6" />
                        </span>
                        <p className="font-semibold text-muted-foreground/60 text-sm">No attendance records found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border/20">
            {rows.map((record) => (
              <div key={record.id} className="p-5 flex flex-col gap-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-extrabold text-foreground leading-snug">{record.courseCode}</span>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 truncate leading-relaxed">
                      {record.courseTitle}
                    </p>
                  </div>
                  <StatusBadge status={record.status} />
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-950/[0.015] dark:bg-white/[0.015] p-3 rounded-xl border border-border/25">
                  <div>
                    <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Session</span>
                    <span className="font-bold text-foreground/80 mt-0.5 block truncate">{record.sessionTitle}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground/50 block font-black uppercase tracking-wider">Distance Offset</span>
                    <div className="mt-0.5 font-mono text-xs text-foreground font-bold">
                      {record.distance !== null && record.distance !== undefined ? (
                        <span className="px-2 py-0.5 rounded bg-muted border border-border/40 text-muted-foreground">
                          {parseFloat(record.distance).toFixed(1)}m
                        </span>
                      ) : (
                        <span className="text-muted-foreground/45 font-medium">-</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-border/15">
                  <span className="text-[9px] text-muted-foreground/50 font-black uppercase tracking-wider">Checked in on</span>
                  <span className="font-bold text-foreground/80">{record.checkInAt.toLocaleString()}</span>
                </div>
              </div>
            ))}
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 px-6">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground/35">
                  <History className="size-6" />
                </span>
                <p className="font-semibold text-muted-foreground/60 text-sm font-semibold">No attendance records found.</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
