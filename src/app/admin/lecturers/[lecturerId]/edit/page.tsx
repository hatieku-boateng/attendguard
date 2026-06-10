import { eq } from "drizzle-orm";
import { UserRound } from "lucide-react";

import { deleteLecturerAction, updateLecturerAction } from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/db/client";
import { lecturerProfiles, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";

const errorMessages: Record<string, string> = {
  invalid: "Enter a valid name and email.",
  image: "Upload a valid image under 750 KB.",
  assigned: "Remove this lecturer's course assignments before deleting the lecturer.",
};

export default async function EditLecturerPage({
  params,
  searchParams,
}: {
  params: Promise<{ lecturerId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("administrator");
  const { lecturerId } = await params;
  const query = await searchParams;
  const db = getDb();
  const [lecturer] = await db
    .select({
      id: lecturerProfiles.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      staffId: lecturerProfiles.staffId,
      department: lecturerProfiles.department,
    })
    .from(lecturerProfiles)
    .innerJoin(users, eq(lecturerProfiles.userId, users.id))
    .where(eq(lecturerProfiles.id, lecturerId))
    .limit(1);

  if (!lecturer) {
    return <PageHeader title="Lecturer not found" />;
  }

  return (
    <>
      <PageHeader
        title="Edit lecturer"
        description="Update lecturer details, picture, and administrative profile data."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="pt-6">
            <form
              action={updateLecturerAction}
              className="grid gap-5 sm:grid-cols-2"
              encType="multipart/form-data"
            >
              <input name="lecturerId" type="hidden" value={lecturer.id} />
              {query.error ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
                  {errorMessages[query.error]}
                </p>
              ) : null}
              <div className="flex items-center gap-4 sm:col-span-2">
                <span className="flex size-16 items-center justify-center rounded-lg bg-muted">
                  {lecturer.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className="size-16 rounded-lg object-cover"
                      src={lecturer.avatarUrl}
                    />
                  ) : (
                    <UserRound className="size-6 text-muted-foreground" />
                  )}
                </span>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{lecturer.name}</p>
                  <p>{lecturer.email}</p>
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Full name</Label>
                <Input defaultValue={lecturer.name} id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  defaultValue={lecturer.email}
                  id="email"
                  name="email"
                  required
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staffId">Staff ID</Label>
                <Input defaultValue={lecturer.staffId ?? ""} id="staffId" name="staffId" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  defaultValue={lecturer.department ?? ""}
                  id="department"
                  name="department"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar">Replace picture</Label>
                <Input accept="image/*" id="avatar" name="avatar" type="file" />
              </div>
              <div className="sm:col-span-2">
                <Button className="w-full" type="submit">
                  Save lecturer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Delete lecturer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Lecturer accounts can be deleted after their assigned courses have
              been removed or reassigned.
            </p>
            <form action={deleteLecturerAction}>
              <input name="lecturerId" type="hidden" value={lecturer.id} />
              <ConfirmSubmitButton message="Delete this lecturer account? This cannot be undone.">
                Delete lecturer
              </ConfirmSubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
