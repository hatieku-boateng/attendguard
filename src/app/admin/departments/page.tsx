import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Pencil, Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDb } from "@/db/client";
import { departments, faculties } from "@/db/schema";
import { ensureDefaultFacultyDepartment } from "@/lib/institution-data";
import { requireRole } from "@/lib/auth";

export default async function AdminDepartmentsPage() {
  await requireRole("administrator");
  await ensureDefaultFacultyDepartment();
  const db = getDb();
  const rows = await db
    .select({
      id: departments.id,
      name: departments.name,
      code: departments.code,
      status: departments.status,
      description: departments.description,
      facultyName: faculties.name,
    })
    .from(departments)
    .innerJoin(faculties, eq(departments.facultyId, faculties.id))
    .orderBy(asc(faculties.name), asc(departments.name));

  return (
    <>
      <PageHeader
        title="Departments"
        description="Manage departments and their parent faculty relationship."
        actions={
          <Button asChild>
            <Link href="/admin/departments/new">
              <Plus className="size-4" />
              Add department
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((department) => (
          <Card key={department.id}>
            <CardContent className="flex items-start justify-between gap-4 pt-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{department.name}</h2>
                  <StatusBadge status={department.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {department.code} / {department.facultyName}
                </p>
                {department.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {department.description}
                  </p>
                ) : null}
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/departments/${department.id}/edit`}>
                  <Pencil className="size-3.5" />
                  Edit
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
