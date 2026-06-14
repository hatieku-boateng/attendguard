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
      <div className="max-w-2xl mx-auto">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),oklch(0.52_0.14_200))]" />
          <CardContent className="pt-8 px-6 sm:px-8">
            <form action={createCatalogCourseAction} className="grid gap-5 sm:grid-cols-2">
              {params.error ? (
                <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive leading-relaxed sm:col-span-2">
                  {errorMessages[params.error]}
                </p>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="courseCode" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Course code</Label>
                <Input className="uppercase-input" id="courseCode" name="courseCode" placeholder="CSM 201" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="courseTitle" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Course title</Label>
                <Input id="courseTitle" name="courseTitle" placeholder="e.g. Introduction to Databases" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="programme" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Programme</Label>
                <Input id="programme" name="programme" placeholder="e.g. Computer Science" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="level" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Level</Label>
                <Input id="level" name="level" placeholder="e.g. 200" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                <Textarea id="description" name="description" placeholder="A brief description of the course scope..." rows={4} />
              </div>
              <div className="sm:col-span-2 pt-2">
                <Button className="w-full py-5 rounded-xl font-bold shadow-md shadow-primary/20 hover:shadow-lg text-sm" type="submit">
                  Create catalogue course
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
