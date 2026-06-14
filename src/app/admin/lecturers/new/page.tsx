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
      <div className="max-w-2xl mx-auto">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
          <CardContent className="pt-8 px-6 sm:px-8">
            <form
              action={createLecturerAction}
              className="grid gap-5 sm:grid-cols-2"
              encType="multipart/form-data"
            >
              {params.error ? (
                <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed sm:col-span-2">
                  {errorMessages[params.error]}
                </p>
              ) : null}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full name</Label>
                <Input id="name" name="name" required placeholder="e.g. Dr. Jane Doe" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email address</Label>
                <Input id="email" name="email" required type="email" placeholder="jane.doe@university.edu" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Temporary password</Label>
                <Input id="password" name="password" required type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffId" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Staff ID</Label>
                <Input id="staffId" name="staffId" placeholder="L-100" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Department</Label>
                <Input id="department" name="department" placeholder="Computer Science" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="avatar" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Profile picture</Label>
                  <span className="text-[0.68rem] text-muted-foreground/60 font-medium">JPG/PNG/GIF up to 750KB</span>
                </div>
                <Input accept="image/*" id="avatar" name="avatar" type="file" className="file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer pt-1.5" />
              </div>
              <div className="sm:col-span-2 pt-2">
                <Button className="w-full py-5 rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg text-sm" type="submit">
                  Create lecturer account
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
