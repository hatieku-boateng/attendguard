import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";

import { deleteDepartmentAction, updateDepartmentAction } from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getDb } from "@/db/client";
import { departments, faculties } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function EditDepartmentPage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  await requireRole("administrator");
  const { departmentId } = await params;
  const db = getDb();
  const [[department], facultyRows] = await Promise.all([
    db.select().from(departments).where(eq(departments.id, departmentId)).limit(1),
    db.select().from(faculties).orderBy(asc(faculties.name)),
  ]);

  if (!department) {
    return <PageHeader title="Department not found" />;
  }

  return (
    <>
      <PageHeader
        title="Edit department"
        description={department.name}
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/departments">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardContent className="pt-6">
            <form action={updateDepartmentAction} className="grid gap-5 sm:grid-cols-2">
              <input name="departmentId" type="hidden" value={department.id} />
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="facultyId">Faculty</Label>
                <select
                  className="h-9 w-full rounded-lg border bg-card px-3 text-sm"
                  defaultValue={department.facultyId}
                  id="facultyId"
                  name="facultyId"
                  required
                >
                  {facultyRows.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Department name</Label>
                <Input defaultValue={department.name} id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Department code</Label>
                <Input
                  className="uppercase-input"
                  defaultValue={department.code}
                  id="code"
                  name="code"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  className="h-9 w-full rounded-lg border bg-card px-3 text-sm"
                  defaultValue={department.status}
                  id="status"
                  name="status"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  defaultValue={department.description ?? ""}
                  id="description"
                  name="description"
                  rows={4}
                />
              </div>
              <Button className="sm:col-span-2" type="submit">
                Save department
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Delete department</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              If linked students or catalogue entries exist, the department will be marked
              inactive instead of permanently deleted.
            </p>
            <form action={deleteDepartmentAction}>
              <input name="departmentId" type="hidden" value={department.id} />
              <ConfirmSubmitButton message="Delete this department or mark it inactive if it has linked records?">
                Delete department
              </ConfirmSubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
