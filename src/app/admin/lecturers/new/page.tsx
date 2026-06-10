import { createLecturerAction } from "@/app/admin/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const errorMessages: Record<string, string> = {
  invalid: "Enter a name, email, and password of at least 8 characters.",
  exists: "A user already exists with that email.",
  image: "Upload a valid image under 750 KB.",
};

export default async function NewLecturerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <PageHeader
        title="New lecturer"
        description="Create a teacher account. The lecturer can later enrol students and manage assigned attendance sessions."
      />
      <Card>
        <CardContent className="pt-6">
          <form
            action={createLecturerAction}
            className="grid gap-5 sm:grid-cols-2"
            encType="multipart/form-data"
          >
            {params.error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
                {errorMessages[params.error]}
              </p>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" required type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Temporary password</Label>
              <Input id="password" name="password" required type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffId">Staff ID</Label>
              <Input id="staffId" name="staffId" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" name="department" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="avatar">Profile picture</Label>
              <Input accept="image/*" id="avatar" name="avatar" type="file" />
            </div>
            <div className="sm:col-span-2">
              <Button className="w-full" type="submit">
                Create lecturer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
