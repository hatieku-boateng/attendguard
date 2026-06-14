import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";

import { updateAcademicYearAction } from "@/app/admin/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/db/client";
import { academicYears } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function EditAcademicYearPage({
  params,
}: {
  params: Promise<{ academicYearId: string }>;
}) {
  await requireRole("administrator");
  const { academicYearId } = await params;
  const db = getDb();
  const [year] = await db
    .select()
    .from(academicYears)
    .where(eq(academicYears.id, academicYearId))
    .limit(1);

  if (!year) {
    return <PageHeader title="Academic year not found" />;
  }

  return (
    <>
      <PageHeader
        title="Edit academic year"
        description={year.displayName}
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/academic-years">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
        }
      />
      <Card className="mx-auto max-w-xl">
        <CardContent className="pt-6">
          <form action={updateAcademicYearAction} className="space-y-5">
            <input name="academicYearId" type="hidden" value={year.id} />
            <div className="space-y-2">
              <Label htmlFor="displayName">Academic year</Label>
              <Input
                defaultValue={year.displayName}
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
                defaultValue={year.status}
                id="status"
                name="status"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <label className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <input defaultChecked={year.isCurrent} name="isCurrent" type="checkbox" />
              Mark as current academic year
            </label>
            <Button className="w-full" type="submit">
              Save academic year
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
