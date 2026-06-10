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
        title="Administrator dashboard"
        description="Create lecturer accounts, assign courses, and oversee institutional attendance setup."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Lecturers" value={lecturerCount.value} tone="info" />
        <StatCard label="Courses" value={courseCount.value} tone="success" />
        <StatCard label="Students" value={studentCount.value} />
        <StatCard label="Active users" value={activeUsers.value} tone="warning" />
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Administration model</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-muted-foreground md:grid-cols-3">
          <p>Administrators create lecturer accounts and control course ownership.</p>
          <p>Courses are assigned to lecturers before attendance operations begin.</p>
          <p>Lecturers enrol students into their assigned courses and manage sessions.</p>
        </CardContent>
      </Card>
    </>
  );
}
