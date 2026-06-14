import { count, eq } from "drizzle-orm";
import { UserPlus, FolderKanban, UserCheck } from "lucide-react";

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
      
      <Card className="mt-8 overflow-hidden relative glass-panel border-border/40">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
        
        <CardHeader className="border-b border-border/30 bg-slate-950/[0.01] dark:bg-white/[0.01] pb-4">
          <CardTitle className="text-base font-bold text-foreground">Operational Blueprint</CardTitle>
        </CardHeader>
        
        <CardContent className="grid gap-6 md:grid-cols-3 pt-6">
          {/* Step 1 */}
          <div className="p-5.5 rounded-2xl bg-card/35 border border-border/40 hover:border-primary/40 hover:bg-card/70 transition-all duration-300 shadow-sm flex flex-col justify-between group hover:-translate-y-0.5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/15 shadow-inner group-hover:scale-105 transition-transform">
                  <UserPlus className="size-4.5" />
                </span>
                <span className="text-[0.62rem] font-black uppercase tracking-widest text-muted-foreground/40">Step 01</span>
              </div>
              <h3 className="font-extrabold text-foreground text-sm mt-4.5">
                User Provisioning
              </h3>
              <p className="text-xs font-semibold text-muted-foreground/75 leading-relaxed mt-2">
                Administrators create and manage credentials for academic lecturers, ensuring secure environment keys.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-5.5 rounded-2xl bg-card/35 border border-border/40 hover:border-emerald-500/40 hover:bg-card/70 transition-all duration-300 shadow-sm flex flex-col justify-between group hover:-translate-y-0.5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/15 shadow-inner group-hover:scale-105 transition-transform">
                  <FolderKanban className="size-4.5" />
                </span>
                <span className="text-[0.62rem] font-black uppercase tracking-widest text-muted-foreground/40">Step 02</span>
              </div>
              <h3 className="font-extrabold text-foreground text-sm mt-4.5">
                Course Assignment
              </h3>
              <p className="text-xs font-semibold text-muted-foreground/75 leading-relaxed mt-2">
                Courses must be assigned to verified lecturers before attendance perimeters and tracking logs can be created.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-5.5 rounded-2xl bg-card/35 border border-border/40 hover:border-cyan-500/40 hover:bg-card/70 transition-all duration-300 shadow-sm flex flex-col justify-between group hover:-translate-y-0.5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/15 shadow-inner group-hover:scale-105 transition-transform">
                  <UserCheck className="size-4.5" />
                </span>
                <span className="text-[0.62rem] font-black uppercase tracking-widest text-muted-foreground/40">Step 03</span>
              </div>
              <h3 className="font-extrabold text-foreground text-sm mt-4.5">
                Student Enrolment
              </h3>
              <p className="text-xs font-semibold text-muted-foreground/75 leading-relaxed mt-2">
                Lecturers enrol active students into their assigned course perimeters, managing locations and check-in verifications.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
