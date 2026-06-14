import { asc } from "drizzle-orm";

import { createDepartmentAction } from "@/app/admin/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getDb } from "@/db/client";
import { faculties } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { ensureDefaultFacultyDepartment } from "@/lib/institution-data";

export default async function NewDepartmentPage() {
  await requireRole("administrator");
  await ensureDefaultFacultyDepartment();
  const db = getDb();
  const facultyRows = await db.select().from(faculties).orderBy(asc(faculties.name));

  return (
    <>
      <PageHeader
        title="Add department"
        description="Create a department under an existing faculty."
      />
      <Card className="mx-auto max-w-2xl">
        <CardContent className="pt-6">
          <form action={createDepartmentAction} className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="facultyId">Faculty</Label>
              <select
                className="h-9 w-full rounded-lg border bg-card px-3 text-sm"
                id="facultyId"
                name="facultyId"
                required
              >
                <option value="">Select faculty</option>
                {facultyRows.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Department name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Department code</Label>
              <Input className="uppercase-input" id="code" name="code" required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={4} />
            </div>
            <Button className="sm:col-span-2" type="submit">
              Create department
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
