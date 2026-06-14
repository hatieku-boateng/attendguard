import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Pencil, Plus, Calendar } from "lucide-react";

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
          <Card key={year.id} className={`glass-panel glass-panel-hover border-border/40 overflow-hidden relative shadow-sm hover:shadow-md transition-all duration-300 group hover:-translate-y-0.5 ${year.isCurrent ? "border-l-4 border-l-primary" : ""}`}>
            <CardContent className="flex items-center justify-between gap-4 pt-6">
              <div className="flex items-center gap-3.5">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/5 text-primary border border-primary/10 group-hover:bg-primary/10 transition-colors shrink-0">
                  <Calendar className="size-5" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-extrabold text-foreground group-hover:text-primary transition-colors">{year.displayName}</h2>
                    <StatusBadge status={year.status} />
                    {year.isCurrent ? (
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary">
                        Current
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    Duration: {year.startYear} to {year.endYear}
                  </p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="h-8.5 rounded-lg text-xs font-bold shadow-sm shrink-0">
                <Link href={`/admin/academic-years?modal=edit&id=${year.id}`} className="flex items-center gap-1.5">
                  <Pencil className="size-3.5" />
                  <span>Edit</span>
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
