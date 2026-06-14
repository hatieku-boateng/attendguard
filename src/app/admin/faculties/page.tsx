import Link from "next/link";
import { asc } from "drizzle-orm";
import { Pencil, Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDb } from "@/db/client";
import { departments, faculties } from "@/db/schema";
import { ensureDefaultFacultyDepartment } from "@/lib/institution-data";
import { requireRole } from "@/lib/auth";

export default async function AdminFacultiesPage() {
  await requireRole("administrator");
  await ensureDefaultFacultyDepartment();
  const db = getDb();
  const [facultyRows, departmentRows] = await Promise.all([
    db.select().from(faculties).orderBy(asc(faculties.name)),
    db
      .select()
      .from(departments)
      .orderBy(asc(departments.name)),
  ]);

  return (
    <>
      <PageHeader
        title="Faculties"
        description="Manage institutional faculties and view their linked departments."
        actions={
          <Button asChild>
            <Link href="/admin/faculties/new">
              <Plus className="size-4" />
              Add faculty
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4">
        {facultyRows.map((faculty) => {
          const facultyDepartments = departmentRows.filter(
            (department) => department.facultyId === faculty.id,
          );

          return (
            <Card key={faculty.id}>
              <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{faculty.name}</h2>
                      <StatusBadge status={faculty.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{faculty.code}</p>
                    {faculty.description ? (
                      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                        {faculty.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Departments
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {facultyDepartments.length > 0 ? (
                        facultyDepartments.map((department) => (
                          <span
                            className="rounded-lg border bg-muted/45 px-2.5 py-1 text-xs font-medium"
                            key={department.id}
                          >
                            {department.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No departments yet.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/faculties/${faculty.id}/edit`}>
                    <Pencil className="size-3.5" />
                    Edit
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
