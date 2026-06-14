import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Pencil, Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/db/client";
import { academicYears } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { ensureGeneratedAcademicYears } from "@/lib/institution-data";
import { generatedAcademicYearOptions } from "@/lib/institution";
import { FormModal } from "@/components/form-modal";
import { createAcademicYearAction, updateAcademicYearAction } from "@/app/admin/actions";

export default async function AcademicYearsPage({
  searchParams,
}: {
  searchParams: Promise<{ modal?: string; id?: string; error?: string }>;
}) {
  await requireRole("administrator");
  await ensureGeneratedAcademicYears();
  
  const params = await searchParams;
  const db = getDb();
  const rows = await db
    .select()
    .from(academicYears)
    .orderBy(desc(academicYears.startYear));

  // Fetch data for edit modal if open
  let editYear = null;
  if (params.modal === "edit" && params.id) {
    [editYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.id, params.id))
      .limit(1);
  }

  const currentDefaultOption = generatedAcademicYearOptions().find((option) => option.isCurrent)!;

  return (
    <>
      <PageHeader
        title="Academic Years"
        description="Manage academic-year options used across students, catalogue entries, sessions, and reports."
        actions={
          <Button asChild>
            <Link href="/admin/academic-years?modal=new">
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
                <Link href={`/admin/academic-years?modal=edit&id=${year.id}`}>
                  <Pencil className="size-3.5" />
                  Edit
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* New Academic Year Modal */}
      <FormModal
        isOpen={params.modal === "new"}
        title="Add academic year"
        description="Use YYYY/YYYY format. The end year must be exactly one year after the start year."
      >
        <form action={createAcademicYearAction} className="space-y-5 pt-2">
          {params.error === "format" ? (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed">
              Invalid format or logic. Please check that the end year is exactly start year + 1.
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="displayName">Academic year</Label>
            <Input
              defaultValue={currentDefaultOption.displayName}
              id="displayName"
              name="displayName"
              pattern="\d{4}/\d{4}"
              placeholder="2025/2026"
              required
            />
          </div>
          <Button className="w-full" type="submit">
            Create academic year
          </Button>
        </form>
      </FormModal>

      {/* Edit Academic Year Modal */}
      {editYear && (
        <FormModal
          isOpen={params.modal === "edit" && !!editYear}
          title="Edit academic year"
          description={editYear.displayName}
        >
          <form action={updateAcademicYearAction} className="space-y-5 pt-2">
            <input name="academicYearId" type="hidden" value={editYear.id} />
            {params.error === "format" ? (
              <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed">
                Invalid format or logic. Please check that the end year is exactly start year + 1.
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="displayName">Academic year</Label>
              <Input
                defaultValue={editYear.displayName}
                id="displayName"
                name="displayName"
                pattern="\d{4}/\d{4}"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                className="h-9 w-full rounded-lg border bg-card px-3 text-sm"
                defaultValue={editYear.status}
                id="status"
                name="status"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <label className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <input defaultChecked={editYear.isCurrent} name="isCurrent" type="checkbox" />
              Mark as current academic year
            </label>
            <Button className="w-full" type="submit">
              Save academic year
            </Button>
          </form>
        </FormModal>
      )}
    </>
  );
}
