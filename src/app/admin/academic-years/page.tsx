import Link from "next/link";
import { desc } from "drizzle-orm";
import { Pencil, Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDb } from "@/db/client";
import { academicYears } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { ensureGeneratedAcademicYears } from "@/lib/institution-data";

export default async function AcademicYearsPage() {
  await requireRole("administrator");
  await ensureGeneratedAcademicYears();
  const db = getDb();
  const rows = await db
    .select()
    .from(academicYears)
    .orderBy(desc(academicYears.startYear));

  return (
    <>
      <PageHeader
        title="Academic Years"
        description="Manage academic-year options used across students, catalogue entries, sessions, and reports."
        actions={
          <Button asChild>
            <Link href="/admin/academic-years/new">
              <Plus className="size-4" />
              Add academic year
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((year) => (
          <Card key={year.id}>
            <CardContent className="flex items-center justify-between gap-4 pt-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{year.displayName}</h2>
                  <StatusBadge status={year.status} />
                  {year.isCurrent ? (
                    <span className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      Current
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {year.startYear} to {year.endYear}
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/academic-years/${year.id}/edit`}>
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
