import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";

import { deleteFacultyAction, updateFacultyAction } from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getDb } from "@/db/client";
import { faculties } from "@/db/schema";
import { requireRole } from "@/lib/auth";

export default async function EditFacultyPage({
  params,
}: {
  params: Promise<{ facultyId: string }>;
}) {
  await requireRole("administrator");
  const { facultyId } = await params;
  const db = getDb();
  const [faculty] = await db
    .select()
    .from(faculties)
    .where(eq(faculties.id, facultyId))
    .limit(1);

  if (!faculty) {
    return <PageHeader title="Faculty not found" />;
  }

  return (
    <>
      <PageHeader
        title="Edit faculty"
        description={faculty.name}
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/faculties">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardContent className="pt-6">
            <form action={updateFacultyAction} className="grid gap-5 sm:grid-cols-2">
              <input name="facultyId" type="hidden" value={faculty.id} />
              <div className="space-y-2">
                <Label htmlFor="name">Faculty name</Label>
                <Input defaultValue={faculty.name} id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Faculty code</Label>
                <Input
                  className="uppercase-input"
                  defaultValue={faculty.code}
                  id="code"
                  name="code"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  className="h-9 w-full rounded-lg border bg-card px-3 text-sm"
                  defaultValue={faculty.status}
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
                  defaultValue={faculty.description ?? ""}
                  id="description"
                  name="description"
                  rows={4}
                />
              </div>
              <Button className="sm:col-span-2" type="submit">
                Save faculty
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Delete faculty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              If linked departments, students, or catalogue entries exist, the faculty will
              be marked inactive instead of permanently deleted.
            </p>
            <form action={deleteFacultyAction}>
              <input name="facultyId" type="hidden" value={faculty.id} />
              <ConfirmSubmitButton message="Delete this faculty or mark it inactive if it has linked records?">
                Delete faculty
              </ConfirmSubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
