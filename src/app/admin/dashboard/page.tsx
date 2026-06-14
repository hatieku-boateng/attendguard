import { count, eq } from "drizzle-orm";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db/client";
import { courses, lecturerProfiles, studentProfiles, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function AdminDashboardPage() {
  await requireRole("administrator");
  const db = getDb();

  const [lecturerCount] = await db.select({ value: count() }).from(lecturerProfiles);
  const [courseCount] = await db.select({ value: count() }).from(courses);
  const [studentCount] = await db.select({ value: count() }).from(studentProfiles);
  const [activeUsers] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.status, "active"));

  return (
    <>
      <PageHeader
        title="Admin Cockpit"
        description="Monitor system accounts, assign lecturers, register new curriculum courses, and manage the student registry."
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Lecturers" value={lecturerCount.value} tone="info" />
        <StatCard label="Courses" value={courseCount.value} tone="success" />
        <StatCard label="Students" value={studentCount.value} />
        <StatCard label="Active users" value={activeUsers.value} tone="warning" />
      </div>
      <Card className="mt-8 overflow-hidden relative glass-panel glass-panel-hover border-border/40">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
        <CardHeader className="border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01] pb-4">
          <CardTitle className="text-base font-bold text-foreground">Operational Blueprint</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 text-xs sm:text-sm leading-relaxed text-muted-foreground md:grid-cols-3 pt-6">
          <div className="p-4.5 rounded-2xl bg-muted/20 border border-border/30">
            <h3 className="font-extrabold text-foreground mb-2 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs">1</span>
              User Provisioning
            </h3>
            <p className="font-semibold text-muted-foreground/75">Administrators create and manage credentials for academic lecturers, ensuring secure environment keys.</p>
          </div>
          <div className="p-4.5 rounded-2xl bg-muted/20 border border-border/30">
            <h3 className="font-extrabold text-foreground mb-2 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-success-foreground/10 text-emerald-500 text-xs">2</span>
              Course Assignment
            </h3>
            <p className="font-semibold text-muted-foreground/75">Courses must be assigned to verified lecturers before attendance perimeters and tracking logs can be created.</p>
          </div>
          <div className="p-4.5 rounded-2xl bg-muted/20 border border-border/30">
            <h3 className="font-extrabold text-foreground mb-2 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-info-foreground/10 text-cyan-500 text-xs">3</span>
              Student Enrolment
            </h3>
            <p className="font-semibold text-muted-foreground/75">Lecturers enrol active students into their assigned course perimeters, managing locations and check-in verifications.</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
