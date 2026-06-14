import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { getDb } from "@/db/client";
import { departments, faculties } from "@/db/schema";
import { ensureDefaultFacultyDepartment } from "@/lib/institution-data";
import { requireRole } from "@/lib/auth";
import { FormModal } from "@/components/form-modal";
import {
  createDepartmentAction,
  updateDepartmentAction,
  deleteDepartmentAction,
} from "@/app/admin/actions";

export default async function AdminDepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ modal?: string; id?: string; error?: string }>;
}) {
  await requireRole("administrator");
  await ensureDefaultFacultyDepartment();
  
  const params = await searchParams;
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

  // Fetch faculties for modal dropdown
  const facultyRows = await db.select().from(faculties).orderBy(asc(faculties.name));

  // Fetch department for edit modal
  let editDepartment = null;
  if (params.modal === "edit" && params.id) {
    [editDepartment] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, params.id))
      .limit(1);
  }

  return (
    <>
      <PageHeader
        title="Departments"
        description="Manage departments and their parent faculty relationship."
        actions={
          <Button asChild>
            <Link href="/admin/departments?modal=new">
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
                <Link href={`/admin/departments?modal=edit&id=${department.id}`}>
                  <Pencil className="size-3.5" />
                  Edit
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Department Modal */}
      <FormModal
        isOpen={params.modal === "new"}
        title="Add department"
        description="Create a department under an existing faculty."
        className="sm:max-w-xl"
      >
        <form action={createDepartmentAction} className="grid gap-4 sm:grid-cols-2 pt-2">
          {params.error === "missing" ? (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed sm:col-span-2">
              Please complete all required fields.
            </p>
          ) : null}
          <div className="space-y-1.5 sm:col-span-2">
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
          <div className="space-y-1.5">
            <Label htmlFor="name">Department name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">Department code</Label>
            <Input className="uppercase-input" id="code" name="code" required />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
          <div className="sm:col-span-2 pt-2">
            <Button className="w-full" type="submit">
              Create department
            </Button>
          </div>
        </form>
      </FormModal>

      {/* Edit Department Modal */}
      {editDepartment && (
        <FormModal
          isOpen={params.modal === "edit" && !!editDepartment}
          title="Edit department"
          description={editDepartment.name}
          className="sm:max-w-2xl"
        >
          <div className="grid gap-6 pt-2 md:grid-cols-[1fr_200px]">
            <form action={updateDepartmentAction} className="grid gap-4 sm:grid-cols-2">
              <input name="departmentId" type="hidden" value={editDepartment.id} />
              {params.error === "missing" ? (
                <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed sm:col-span-2">
                  Please complete all required fields.
                </p>
              ) : null}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="facultyId">Faculty</Label>
                <select
                  className="h-9 w-full rounded-lg border bg-card px-3 text-sm"
                  defaultValue={editDepartment.facultyId}
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
              <div className="space-y-1.5">
                <Label htmlFor="name">Department name</Label>
                <Input defaultValue={editDepartment.name} id="name" name="name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code">Department code</Label>
                <Input
                  className="uppercase-input"
                  defaultValue={editDepartment.code}
                  id="code"
                  name="code"
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="status">Status</Label>
                <select
                  className="h-9 w-full rounded-lg border bg-card px-3 text-sm"
                  defaultValue={editDepartment.status}
                  id="status"
                  name="status"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  defaultValue={editDepartment.description ?? ""}
                  id="description"
                  name="description"
                  rows={3}
                />
              </div>
              <div className="sm:col-span-2 pt-2">
                <Button className="w-full" type="submit">
                  Save department
                </Button>
              </div>
            </form>

            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-4 text-xs text-muted-foreground flex flex-col justify-between h-fit self-start">
              <div>
                <h4 className="font-extrabold text-foreground uppercase tracking-wider mb-2">Delete Department</h4>
                <p className="leading-relaxed">
                  If linked students or catalogue entries exist, the department will be marked inactive instead of permanently deleted.
                </p>
              </div>
              <form action={deleteDepartmentAction}>
                <input name="departmentId" type="hidden" value={editDepartment.id} />
                <ConfirmSubmitButton message="Delete this department or mark it inactive if it has linked records?" className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8.5 rounded-lg flex items-center justify-center gap-1.5 font-bold">
                  <Trash2 className="size-3.5" />
                  <span>Delete Department</span>
                </ConfirmSubmitButton>
              </form>
            </div>
          </div>
        </FormModal>
      )}
    </>
  );
}
