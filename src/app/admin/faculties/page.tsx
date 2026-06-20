import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Pencil, Plus, Trash2, School } from "lucide-react";

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
  createFacultyAction,
  updateFacultyAction,
  deleteFacultyAction,
} from "@/app/admin/actions";

export default async function AdminFacultiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    modal?: string;
    id?: string;
    error?: string;
    updated?: string;
    deleted?: string;
    archived?: string;
  }>;
}) {
  await requireRole("administrator");
  await ensureDefaultFacultyDepartment();
  
  const params = await searchParams;
  const db = getDb();

  const [facultyRows, departmentRows] = await Promise.all([
    db.select().from(faculties).orderBy(asc(faculties.name)),
    db
      .select()
      .from(departments)
      .orderBy(asc(departments.name)),
  ]);

  // Fetch faculty for edit modal
  let editFaculty = null;
  if (params.modal === "edit" && params.id) {
    [editFaculty] = await db
      .select()
      .from(faculties)
      .where(eq(faculties.id, params.id))
      .limit(1);
  }

  const errorMessages: Record<string, string> = {
    missing: "Please enter a faculty name and code.",
    exists: "A faculty with that code already exists.",
  };

  return (
    <>
      <PageHeader
        title="Faculties"
        description="Manage institutional faculties and view their linked departments."
        actions={
          <Button asChild>
            <Link href="/admin/faculties?modal=new">
              <Plus className="size-4" />
              Add faculty
            </Link>
          </Button>
        }
      />
      {params.updated || params.deleted || params.archived ? (
        <p className="mb-4 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs font-semibold text-primary leading-relaxed">
          {params.updated
            ? "Faculty details updated successfully."
            : params.deleted
              ? "Faculty deleted successfully."
              : "Faculty has linked records, so it was marked inactive instead of permanently deleted."}
        </p>
      ) : null}
      <div className="grid gap-4">
        {facultyRows.map((faculty) => {
          const facultyDepartments = departmentRows.filter(
            (department) => department.facultyId === faculty.id,
          );

          return (
            <Card key={faculty.id} className="glass-panel glass-panel-hover border-border/40 overflow-hidden relative shadow-sm hover:shadow-md transition-all duration-300 group hover:-translate-y-0.5">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/20 group-hover:bg-primary/50 transition-colors" />
              <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/5 text-primary border border-primary/10 group-hover:bg-primary/10 transition-colors shrink-0">
                    <School className="size-5" />
                  </span>
                  <div className="space-y-3 min-w-0">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-extrabold text-foreground group-hover:text-primary transition-colors leading-snug">{faculty.name}</h2>
                        <StatusBadge status={faculty.status} />
                      </div>
                      <p className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">{faculty.code}</p>
                      {faculty.description ? (
                        <p className="mt-2 max-w-3xl text-xs font-semibold text-muted-foreground/80 leading-relaxed">
                          {faculty.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/50">
                        Linked Departments
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {facultyDepartments.length > 0 ? (
                          facultyDepartments.map((department) => (
                            <span
                              className="rounded-lg border border-border/40 bg-muted/40 px-2.5 py-1 text-xs font-bold text-foreground/80"
                              key={department.id}
                            >
                              {department.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground/50 font-semibold italic">
                            No departments registered yet.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="h-8.5 rounded-lg text-xs font-bold shadow-sm shrink-0">
                  <Link href={`/admin/faculties?modal=edit&id=${faculty.id}`} className="flex items-center gap-1.5">
                    <Pencil className="size-3.5" />
                    <span>Edit</span>
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Faculty Modal */}
      <FormModal
        isOpen={params.modal === "new"}
        title="Add faculty"
        description="Create a faculty that can own departments, students, and catalogue entries."
        className="sm:max-w-xl"
      >
        <form action={createFacultyAction} className="grid gap-4 sm:grid-cols-2 pt-2">
          {params.error && errorMessages[params.error] ? (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed sm:col-span-2">
              {errorMessages[params.error]}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="name">Faculty name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">Faculty code</Label>
            <Input className="uppercase-input" id="code" name="code" required />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
          <div className="sm:col-span-2 pt-2">
            <Button className="w-full" type="submit">
              Create faculty
            </Button>
          </div>
        </form>
      </FormModal>

      {/* Edit Faculty Modal */}
      {editFaculty && (
        <FormModal
          isOpen={params.modal === "edit" && !!editFaculty}
          title="Edit faculty"
          description={editFaculty.name}
          className="sm:max-w-2xl"
        >
          <div className="grid gap-6 pt-2 md:grid-cols-[1fr_200px]">
            <form action={updateFacultyAction} className="grid gap-4 sm:grid-cols-2">
              <input name="facultyId" type="hidden" value={editFaculty.id} />
              {params.error && errorMessages[params.error] ? (
                <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed sm:col-span-2">
                  {errorMessages[params.error]}
                </p>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="name">Faculty name</Label>
                <Input defaultValue={editFaculty.name} id="name" name="name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code">Faculty code</Label>
                <Input
                  className="uppercase-input"
                  defaultValue={editFaculty.code}
                  id="code"
                  name="code"
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="status">Status</Label>
                <select
                  className="h-9 w-full rounded-lg border bg-card px-3 text-sm"
                  defaultValue={editFaculty.status}
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
                  defaultValue={editFaculty.description ?? ""}
                  id="description"
                  name="description"
                  rows={3}
                />
              </div>
              <div className="sm:col-span-2 pt-2">
                <Button className="w-full" type="submit">
                  Save faculty
                </Button>
              </div>
            </form>

            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-4 text-xs text-muted-foreground flex flex-col justify-between h-fit self-start">
              <div>
                <h4 className="font-extrabold text-foreground uppercase tracking-wider mb-2">Delete Faculty</h4>
                <p className="leading-relaxed">
                  If linked departments, students, or catalogue entries exist, the faculty will be marked inactive instead of permanently deleted.
                </p>
              </div>
              <form action={deleteFacultyAction}>
                <input name="facultyId" type="hidden" value={editFaculty.id} />
                <ConfirmSubmitButton message="Delete this faculty or mark it inactive if it has linked records?" className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8.5 rounded-lg flex items-center justify-center gap-1.5 font-bold">
                  <Trash2 className="size-3.5" />
                  <span>Delete Faculty</span>
                </ConfirmSubmitButton>
              </form>
            </div>
          </div>
        </FormModal>
      )}
    </>
  );
}
