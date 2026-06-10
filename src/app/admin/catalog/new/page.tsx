import { createCatalogCourseAction } from "@/app/admin/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth";

const errorMessages: Record<string, string> = {
  missing: "Enter a course code and course title.",
  exists: "A catalogue course already exists with that code.",
};

export default async function NewCatalogCoursePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("administrator");
  const params = await searchParams;

  return (
    <>
      <PageHeader
        title="New catalogue course"
        description="Create the course record once. Lecturer assignment happens separately."
      />
      <Card>
        <CardContent className="pt-6">
          <form action={createCatalogCourseAction} className="grid gap-5 sm:grid-cols-2">
            {params.error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
                {errorMessages[params.error]}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="courseCode">Course code</Label>
              <Input id="courseCode" name="courseCode" placeholder="CSM 201" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseTitle">Course title</Label>
              <Input id="courseTitle" name="courseTitle" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="programme">Programme</Label>
              <Input id="programme" name="programme" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Input id="level" name="level" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={4} />
            </div>
            <div className="sm:col-span-2">
              <Button className="w-full" type="submit">
                Create catalogue course
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
