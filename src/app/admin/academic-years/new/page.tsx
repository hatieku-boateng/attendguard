import { createAcademicYearAction } from "@/app/admin/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/lib/auth";
import { generatedAcademicYearOptions } from "@/lib/institution";

export default async function NewAcademicYearPage() {
  await requireRole("administrator");
  const current = generatedAcademicYearOptions().find((option) => option.isCurrent)!;

  return (
    <>
      <PageHeader
        title="Add academic year"
        description="Use YYYY/YYYY format. The end year must be exactly one year after the start year."
      />
      <Card className="mx-auto max-w-xl">
        <CardContent className="pt-6">
          <form action={createAcademicYearAction} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="displayName">Academic year</Label>
              <Input
                defaultValue={current.displayName}
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
        </CardContent>
      </Card>
    </>
  );
}
