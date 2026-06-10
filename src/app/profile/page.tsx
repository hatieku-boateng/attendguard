import { eq } from "drizzle-orm";
import { UserRound } from "lucide-react";

import { updateProfileAction } from "@/app/profile/actions";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/db/client";
import { lecturerProfiles, studentProfiles, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getWorkspaceNavItems } from "@/lib/navigation";

const errorMessages: Record<string, string> = {
  invalid: "Enter a valid name.",
  image: "Upload a valid image under 750 KB.",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const db = getDb();
  const [account] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const [lecturerProfile] = user.lecturerProfileId
    ? await db
        .select()
        .from(lecturerProfiles)
        .where(eq(lecturerProfiles.id, user.lecturerProfileId))
        .limit(1)
    : [];
  const [studentProfile] = user.studentProfileId
    ? await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.id, user.studentProfileId))
        .limit(1)
    : [];

  return (
    <AppShell navItems={getWorkspaceNavItems(user.role)} user={user}>
      <PageHeader
        title="Profile"
        description="Update your account information and workspace picture."
      />
      <Card>
        <CardContent className="pt-6">
          <form
            action={updateProfileAction}
            className="grid gap-5 sm:grid-cols-2"
            encType="multipart/form-data"
          >
            {params.error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
                {errorMessages[params.error]}
              </p>
            ) : null}
            {params.updated ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 sm:col-span-2">
                Profile updated.
              </p>
            ) : null}
            <div className="flex items-center gap-4 sm:col-span-2">
              <span className="flex size-16 items-center justify-center rounded-lg bg-muted">
                {account?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="size-16 rounded-lg object-cover"
                    src={account.avatarUrl}
                  />
                ) : (
                  <UserRound className="size-6 text-muted-foreground" />
                )}
              </span>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{account?.name}</p>
                <p>{account?.email}</p>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Full name</Label>
              <Input defaultValue={account?.name} id="name" name="name" required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="avatar">Profile picture</Label>
              <Input accept="image/*" id="avatar" name="avatar" type="file" />
            </div>
            {user.role === "lecturer" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="staffId">Staff ID</Label>
                  <Input
                    defaultValue={lecturerProfile?.staffId ?? ""}
                    id="staffId"
                    name="staffId"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    defaultValue={lecturerProfile?.department ?? ""}
                    id="department"
                    name="department"
                  />
                </div>
              </>
            ) : null}
            {user.role === "student" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="programme">Programme</Label>
                  <Input
                    defaultValue={studentProfile?.programme ?? ""}
                    id="programme"
                    name="programme"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Input defaultValue={studentProfile?.level ?? ""} id="level" name="level" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classGroup">Class group</Label>
                  <Input
                    defaultValue={studentProfile?.classGroup ?? ""}
                    id="classGroup"
                    name="classGroup"
                  />
                </div>
              </>
            ) : null}
            <div className="sm:col-span-2">
              <Button className="w-full" type="submit">
                Save profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
